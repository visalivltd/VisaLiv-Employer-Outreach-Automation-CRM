import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.services.email_draft_service import extract_draft_content
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
    def get_outreach_preview(
        db: Session,
        page: int = 1,
        page_size: int = 50,
        candidate_id: int | None = None,
    ) -> dict:
        # 1. Fetch active candidates
        candidate_stmt = select(Candidate).where(Candidate.is_active.is_(True)).order_by(Candidate.id)
        if candidate_id is not None:
            candidate_stmt = candidate_stmt.where(Candidate.id == candidate_id)
        active_candidates = db.scalars(candidate_stmt).all()

        # 2. Fetch active employers
        active_employers = db.scalars(
            select(Employer)
            .where(Employer.is_active.is_(True))
            .order_by(Employer.id)
        ).all()

        # 3. Timezone & Today calculations
        india_timezone = timezone(timedelta(hours=5, minutes=30))
        now_utc = datetime.now(timezone.utc)
        cooldown_start = now_utc - timedelta(days=3)
        start_of_today = datetime.now(india_timezone).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # Total emails sent today globally
        emails_sent_today = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.status == "sent",
                EmailLog.sent_at >= start_of_today,
            )
        ) or 0

        # 4. Batch query duplicate sent pairs: (candidate_id, employer_id)
        sent_pairs = set(
            db.execute(
                select(EmailLog.candidate_id, EmailLog.employer_id).where(
                    EmailLog.status == "sent"
                )
            ).all()
        )

        # 5. Batch query employers currently in 3-day cooldown
        cooldown_employer_ids = set(
            db.scalars(
                select(EmailLog.employer_id).where(
                    EmailLog.status == "sent",
                    EmailLog.sent_at >= cooldown_start,
                )
            ).all()
        )

        # 6. Batch query emails sent today per candidate
        sent_today_rows = db.execute(
            select(EmailLog.candidate_id, func.count(EmailLog.id)).where(
                EmailLog.status == "sent",
                EmailLog.sent_at >= start_of_today,
            ).group_by(EmailLog.candidate_id)
        ).all()
        sent_today_per_candidate = {row[0]: row[1] for row in sent_today_rows}

        all_items = []
        candidate_summaries = []
        total_eligible = 0
        total_skipped = 0

        for candidate in active_candidates:
            cand_draft_name = candidate.email_draft_name or (
                candidate.email_draft.draft_name if candidate.email_draft else None
            )

            # Candidate readiness checks
            cand_error = None
            if not candidate.is_active:
                cand_error = "Candidate is inactive"
            elif not candidate.gmail_account:
                cand_error = "Gmail account not connected"
            elif not candidate.email_draft_id or not candidate.email_draft:
                cand_error = "Email draft not assigned to candidate"
            elif (sent_today_per_candidate.get(candidate.id, 0) >= 5):
                cand_error = "Daily limit reached — maximum 5 employers per candidate/day"

            cand_eligible_count = 0

            for employer in active_employers:
                emp_email = (employer.email or "").strip()
                if cand_error:
                    can_send = False
                    reason = cand_error
                elif not employer.is_active:
                    can_send = False
                    reason = "Employer is inactive"
                elif not emp_email or not EMAIL_REGEX.match(emp_email):
                    can_send = False
                    reason = "Invalid employer email address"
                elif (candidate.id, employer.id) in sent_pairs:
                    can_send = False
                    reason = "Already contacted by this candidate"
                elif employer.id in cooldown_employer_ids:
                    can_send = False
                    reason = "Employer in 3-day cooldown"
                else:
                    can_send = True
                    reason = "Ready"

                if can_send:
                    total_eligible += 1
                    cand_eligible_count += 1
                else:
                    total_skipped += 1

                all_items.append({
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
                    "reason": reason,
                })

            candidate_summaries.append({
                "candidate_id": candidate.id,
                "candidate_name": candidate.full_name,
                "eligible_count": cand_eligible_count,
            })

        # Paginate items
        total_items = len(all_items)
        offset = (page - 1) * page_size
        paginated_items = all_items[offset : offset + page_size]

        return {
            "total_eligible": total_eligible,
            "total_skipped": total_skipped,
            "total": total_items,
            "eligible_today": total_eligible,
            "ready_count": total_eligible,
            "emails_sent_today": emails_sent_today,
            "skipped_count": total_skipped,
            "page": page,
            "page_size": page_size,
            "candidate_summaries": candidate_summaries,
            "items": paginated_items,
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
        
        # Extract draft subject & body if explicit subject/body not provided
        draft_subj, draft_body = extract_draft_content(
            candidate.email_draft if candidate else None,
            candidate.full_name if candidate else "Candidate"
        )
        final_subject = subject.strip() if subject and subject.strip() else draft_subj
        final_body = body.strip() if body and body.strip() else draft_body

        # Attach ONLY the candidate CV (never attach the email draft docx itself)
        attachment_paths = []
        if candidate and candidate.cv_file_path:
            attachment_paths.append(candidate.cv_file_path)

        return EmailService.send_and_log(
            db=db,
            candidate_id=candidate_id,
            employer_id=employer_id,
            gmail_account=gmail_account,
            to_email=employer.email,
            subject=final_subject,
            body=final_body,
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
            draft_subj, draft_body = extract_draft_content(
                draft,
                candidate.full_name
            )

            subject = item.get("subject").strip() if item.get("subject") and item.get("subject").strip() else draft_subj
            body = item.get("body").strip() if item.get("body") and item.get("body").strip() else draft_body

            # Attach ONLY candidate's CV (never attach the email draft docx)
            attachment_paths = []
            if candidate.cv_file_path:
                attachment_paths.append(candidate.cv_file_path)

            print("=" * 60, flush=True)
            print("OUTREACH PAIRING PROCESSING:", flush=True)
            print(f"  Candidate: {candidate.full_name} ({candidate.email})", flush=True)
            print(f"  Employer: {employer.service_name or 'Employer'} ({employer.email})", flush=True)
            print(f"  Gmail account: {candidate.gmail_account.gmail_email}", flush=True)
            print(f"  Draft: {draft.draft_name if draft else 'No draft'}", flush=True)
            print(f"  Subject: {subject}", flush=True)
            print(f"  Attachments: {attachment_paths}", flush=True)

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
                    print("  Result: SUCCESS", flush=True)
                    print("  Failure reason: None", flush=True)
                    print("=" * 60, flush=True)
                    results.append({
                        "candidate_id": candidate_id,
                        "employer_id": employer_id,
                        "status": "sent",
                        "log_id": log.id,
                    })
                else:
                    failed_count += 1
                    print("  Result: FAILED", flush=True)
                    print(f"  Failure reason: {log.error_message}", flush=True)
                    print("=" * 60, flush=True)
                    results.append({
                        "candidate_id": candidate_id,
                        "employer_id": employer_id,
                        "status": "failed",
                        "error": log.error_message,
                    })
            except Exception as e:
                failed_count += 1
                err_msg = str(e)
                print("  Result: FAILED", flush=True)
                print(f"  Failure reason: {err_msg}", flush=True)
                print("=" * 60, flush=True)
                results.append({
                    "candidate_id": candidate_id,
                    "employer_id": employer_id,
                    "status": "failed",
                    "error": err_msg,
                })

        return {
            "sent": sent_count,
            "failed": failed_count,
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