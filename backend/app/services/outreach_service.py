import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.services.email_service import EmailService

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class OutreachService:

    @staticmethod
    def can_send(
        db: Session,
        candidate_id: int,
        employer_id: int,
    ) -> tuple[bool, str | None]:
        # 1. Candidate check
        candidate = db.get(Candidate, candidate_id)
        if candidate is None:
            return False, "Candidate does not exist"
        if not candidate.is_active:
            return False, "Candidate is inactive"
        if not candidate.gmail_account:
            return False, "Gmail account not connected"
        if not candidate.email_draft_id or not candidate.email_draft:
            return False, "Email draft not assigned to candidate"

        # 2. Employer check
        employer = db.get(Employer, employer_id)
        if employer is None:
            return False, "Employer does not exist"
        if not employer.is_active:
            return False, "Employer is inactive"

        emp_email = (employer.email or "").strip()
        if not emp_email or not EMAIL_REGEX.match(emp_email):
            return False, "Invalid employer email address"

        # 3. Permanent Candidate -> Employer Duplicate Rule
        previous_email = db.scalar(
            select(EmailLog).where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.employer_id == employer_id,
                EmailLog.status == "sent",
            )
        )

        if previous_email:
            return False, "Already contacted by this candidate"

        # 4. Employer-Level 3-Day Cooldown Rule
        cooldown_start = datetime.now(timezone.utc) - timedelta(days=3)

        recent_employer_email = db.scalar(
            select(EmailLog)
            .where(
                EmailLog.employer_id == employer_id,
                EmailLog.status == "sent",
                EmailLog.sent_at >= cooldown_start,
            )
            .order_by(EmailLog.sent_at.desc())
        )

        if recent_employer_email:
            return False, "Employer in 3-day cooldown"

        # 5. Rule 1: Max 5 Employers per Candidate per Day
        india_timezone = timezone(timedelta(hours=5, minutes=30))
        start_of_today = datetime.now(india_timezone).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        sent_today_count = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.status == "sent",
                EmailLog.sent_at >= start_of_today,
            )
        ) or 0

        if sent_today_count >= 5:
            return False, "Daily limit reached — maximum 5 employers per candidate/day"

        return True, None

    @staticmethod
    def get_outreach_preview(db: Session) -> dict:

        active_candidates = db.scalars(
            select(Candidate)
            .where(Candidate.is_active.is_(True))
            .order_by(Candidate.id)
        ).all()

        active_employers = db.scalars(
            select(Employer)
            .where(Employer.is_active.is_(True))
            .order_by(Employer.id)
        ).all()

        # Count emails sent today from email_logs
        india_timezone = timezone(timedelta(hours=5, minutes=30))
        start_of_today = datetime.now(india_timezone).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        emails_sent_today = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.status == "sent",
                EmailLog.sent_at >= start_of_today,
            )
        ) or 0

        preview_items = []
        candidate_summaries = []
        total_eligible_pairs = 0
        total_skipped_pairs = 0

        for candidate in active_candidates:
            cand_draft_name = candidate.email_draft_name or (
                candidate.email_draft.draft_name if candidate.email_draft else None
            )

            cand_eligible_count = 0

            for employer in active_employers:
                can_send, reason = OutreachService.can_send(
                    db, candidate.id, employer.id
                )

                item = {
                    "candidate_id": candidate.id,
                    "candidate_name": candidate.full_name,
                    "candidate_email": candidate.email,
                    "gmail_account": (
                        candidate.gmail_account.gmail_email
                        if candidate.gmail_account
                        else None
                    ),
                    "email_draft": cand_draft_name,
                    "cv_file_path": candidate.cv_file_path,
                    "employer_id": employer.id,
                    "employer_name": employer.service_name or "Employer",
                    "employer_email": employer.email,
                    "eligible": can_send,
                    "selected": False,
                    "reason": reason or "Ready",
                }

                if can_send:
                    total_eligible_pairs += 1
                    cand_eligible_count += 1
                else:
                    total_skipped_pairs += 1

                preview_items.append(item)

            candidate_summaries.append({
                "candidate_id": candidate.id,
                "candidate_name": candidate.full_name,
                "eligible_count": cand_eligible_count,
            })

        # Deduplicate preview_items by (candidate_id, employer_id)
        seen_pairs = set()
        unique_items = []
        for item in preview_items:
            pair_key = (item["candidate_id"], item["employer_id"])
            if pair_key not in seen_pairs:
                seen_pairs.add(pair_key)
                unique_items.append(item)

        return {
            "eligible_today": total_eligible_pairs,
            "ready_count": total_eligible_pairs,
            "emails_sent_today": emails_sent_today,
            "skipped_count": total_skipped_pairs,
            "candidate_summaries": candidate_summaries,
            "items": unique_items,
        }

    @staticmethod
    def send_outreach(
        db: Session,
        candidate_id: int,
        employer_id: int,
        gmail_account: GmailAccount,
        subject: str,
        body: str,
        draft_id: int | None = None,
    ) -> EmailLog:

        employer = db.get(Employer, employer_id)

        if employer is None:
            raise ValueError("Employer not found")

        can_send, reason = OutreachService.can_send(
            db=db,
            candidate_id=candidate_id,
            employer_id=employer_id,
        )

        if not can_send:
            raise ValueError(reason)

        candidate = db.get(Candidate, candidate_id)
        attachment_paths = []
        if candidate:
            if candidate.cv_file_path:
                attachment_paths.append(candidate.cv_file_path)
            if candidate.email_draft and candidate.email_draft.attachment_path:
                draft = candidate.email_draft
                if draft.attachment_filename:
                    attachment_paths.append((draft.attachment_path, draft.attachment_filename))
                else:
                    attachment_paths.append(draft.attachment_path)

        return EmailService.send_and_log(
            db=db,
            candidate_id=candidate_id,
            employer_id=employer_id,
            gmail_account=gmail_account,
            to_email=employer.email,
            subject=subject,
            body=body,
            attachment_paths=attachment_paths if attachment_paths else None,
        )

    @staticmethod
    def batch_outreach(
        db: Session,
        items: list[dict],
    ) -> dict:
        sent_count = 0
        failed_count = 0
        skipped_count = 0
        results = []

        for item in items:
            candidate_id = item.get("candidate_id")
            employer_id = item.get("employer_id")

            if not candidate_id or not employer_id:
                skipped_count += 1
                continue

            can_send, reason = OutreachService.can_send(db, candidate_id, employer_id)
            if not can_send:
                skipped_count += 1
                results.append({
                    "candidate_id": candidate_id,
                    "employer_id": employer_id,
                    "status": "skipped",
                    "reason": reason,
                })
                continue

            candidate = db.get(Candidate, candidate_id)
            employer = db.get(Employer, employer_id)

            if not candidate or not candidate.gmail_account or not employer:
                skipped_count += 1
                continue

            draft = candidate.email_draft
            subject = item.get("subject") or (draft.subject if draft else f"Outreach Email for {candidate.full_name}")
            body = item.get("body") or (draft.body if draft else f"Dear {employer.service_name or 'Employer'},\n\nPlease find attached the CV for {candidate.full_name}.")

            attachment_paths = []
            if candidate.cv_file_path:
                attachment_paths.append(candidate.cv_file_path)
            if draft and draft.attachment_path:
                if draft.attachment_filename:
                    attachment_paths.append((draft.attachment_path, draft.attachment_filename))
                else:
                    attachment_paths.append(draft.attachment_path)

            try:
                log = EmailService.send_and_log(
                    db=db,
                    candidate_id=candidate_id,
                    employer_id=employer_id,
                    gmail_account=candidate.gmail_account,
                    to_email=employer.email,
                    subject=subject,
                    body=body,
                    attachment_paths=attachment_paths if attachment_paths else None,
                )
                if log.status == "sent":
                    sent_count += 1
                    results.append({
                        "candidate_id": candidate_id,
                        "employer_id": employer_id,
                        "status": "sent",
                        "log_id": log.id,
                    })
                else:
                    failed_count += 1
                    results.append({
                        "candidate_id": candidate_id,
                        "employer_id": employer_id,
                        "status": "failed",
                        "error": log.error_message,
                    })
            except Exception as e:
                failed_count += 1
                results.append({
                    "candidate_id": candidate_id,
                    "employer_id": employer_id,
                    "status": "failed",
                    "error": str(e),
                })

        return {
            "sent_count": sent_count,
            "failed_count": failed_count,
            "skipped_count": skipped_count,
            "details": results,
        }

    @staticmethod
    def batch_send_outreach(
        db: Session,
        items: list[dict],
    ) -> dict:
        return OutreachService.batch_outreach(db, items)