import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, update
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.outreach_job import OutreachJob
from app.repositories.outreach_settings_repository import get_outreach_settings
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
        # 1. Outreach Settings check
        settings = get_outreach_settings(db)
        if not settings.enabled:
            return False, "Automated outreach sending is currently disabled in settings"

        # 2. Candidate check
        candidate = db.get(Candidate, candidate_id)
        if candidate is None:
            return False, "Candidate does not exist"
        if not candidate.is_active:
            return False, "Candidate is inactive"
        if not candidate.gmail_account:
            return False, "Gmail account not connected"
        if not candidate.email_draft_id or not candidate.email_draft:
            return False, "Email draft not assigned to candidate"

        # 3. Employer check
        employer = db.get(Employer, employer_id)
        if employer is None:
            return False, "Employer does not exist"
        if not employer.is_active:
            return False, "Employer is inactive"

        emp_email = (employer.email or "").strip()
        if not emp_email or not EMAIL_REGEX.match(emp_email):
            return False, "Invalid employer email address"

        # 4. Permanent Candidate -> Employer Duplicate Rule
        previous_email = db.scalar(
            select(EmailLog).where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.employer_id == employer_id,
                EmailLog.status.in_(["sent", "pending", "sending"]),
            )
        )

        if previous_email:
            return False, "Already contacted by this candidate"

        # 5. Employer-Level 3-Day Cooldown Rule
        cooldown_start = datetime.now(timezone.utc) - timedelta(days=3)

        recent_employer_email = db.scalar(
            select(EmailLog)
            .where(
                EmailLog.employer_id == employer_id,
                EmailLog.status.in_(["sent", "pending", "sending"]),
                EmailLog.created_at >= cooldown_start,
            )
            .order_by(EmailLog.created_at.desc())
        )

        if recent_employer_email:
            return False, "Employer in 3-day cooldown"

        # 6. Per-Candidate Configurable Daily Limit Rule
        india_timezone = timezone(timedelta(hours=5, minutes=30))
        start_of_today = datetime.now(india_timezone).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        sent_today_count = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.status.in_(["sent", "pending", "sending"]),
                EmailLog.created_at >= start_of_today,
            )
        ) or 0

        if sent_today_count >= settings.max_emails_per_candidate_per_day:
            return False, f"Daily limit reached — maximum {settings.max_emails_per_candidate_per_day} emails/day per candidate"

        # 7. Per-Candidate Minimum Gap Interval Rule
        latest_log = db.scalar(
            select(EmailLog)
            .where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.status.in_(["sent", "pending", "sending"]),
            )
            .order_by(EmailLog.created_at.desc())
        )

        if latest_log:
            last_time = latest_log.sent_at or latest_log.created_at
            if last_time:
                now_utc = datetime.now(timezone.utc)
                if last_time.tzinfo is None:
                    last_time = last_time.replace(tzinfo=timezone.utc)
                elapsed_minutes = (now_utc - last_time).total_seconds() / 60.0

                if elapsed_minutes < settings.min_gap_minutes:
                    next_eligible = last_time + timedelta(minutes=settings.min_gap_minutes)
                    return False, f"Minimum gap of {settings.min_gap_minutes}m between candidate emails not elapsed. Next eligible send time: {next_eligible.strftime('%H:%M:%S UTC')}"

        return True, None

    @staticmethod
    def get_outreach_preview(
        db: Session,
        page: int = 1,
        page_size: int = 50,
        candidate_id: int | None = None,
    ) -> dict:
        settings = get_outreach_settings(db)

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
                    EmailLog.status.in_(["sent", "pending", "sending"])
                )
            ).all()
        )

        # 5. Batch query employers currently in 3-day cooldown
        cooldown_employer_ids = set(
            db.scalars(
                select(EmailLog.employer_id).where(
                    EmailLog.status.in_(["sent", "pending", "sending"]),
                    EmailLog.created_at >= cooldown_start,
                )
            ).all()
        )

        # 6. Batch query emails sent today per candidate
        sent_today_rows = db.execute(
            select(EmailLog.candidate_id, func.count(EmailLog.id)).where(
                EmailLog.status.in_(["sent", "pending", "sending"]),
                EmailLog.created_at >= start_of_today,
            ).group_by(EmailLog.candidate_id)
        ).all()
        sent_today_per_candidate = {row[0]: row[1] for row in sent_today_rows}

        # 7. Query latest email per candidate for minimum gap rule
        latest_sent_rows = db.execute(
            select(EmailLog.candidate_id, func.max(EmailLog.created_at)).where(
                EmailLog.status.in_(["sent", "pending", "sending"])
            ).group_by(EmailLog.candidate_id)
        ).all()
        latest_sent_per_candidate = {row[0]: row[1] for row in latest_sent_rows}

        all_items = []
        candidate_summaries = []
        total_eligible = 0
        total_skipped = 0

        for candidate in active_candidates:
            cand_draft_name = candidate.email_draft_name or (
                candidate.email_draft.draft_name if candidate.email_draft else None
            )

            cand_sent_today = sent_today_per_candidate.get(candidate.id, 0)
            cand_last_time = latest_sent_per_candidate.get(candidate.id)
            cand_next_eligible = None

            if cand_last_time:
                if cand_last_time.tzinfo is None:
                    cand_last_time = cand_last_time.replace(tzinfo=timezone.utc)
                cand_next_eligible = cand_last_time + timedelta(minutes=settings.min_gap_minutes)

            # Candidate readiness checks
            cand_error = None
            if not settings.enabled:
                cand_error = "Automated outreach sending is currently disabled in settings"
            elif not candidate.is_active:
                cand_error = "Candidate is inactive"
            elif not candidate.gmail_account:
                cand_error = "Gmail account not connected"
            elif not candidate.email_draft_id or not candidate.email_draft:
                cand_error = "Email draft not assigned to candidate"
            elif cand_sent_today >= settings.max_emails_per_candidate_per_day:
                cand_error = f"Daily limit reached — maximum {settings.max_emails_per_candidate_per_day} emails/day per candidate"
            elif cand_last_time:
                elapsed_minutes = (now_utc - cand_last_time).total_seconds() / 60.0
                if elapsed_minutes < settings.min_gap_minutes:
                    cand_error = f"Minimum gap of {settings.min_gap_minutes}m between candidate emails not elapsed. Next eligible send time: {cand_next_eligible.strftime('%H:%M:%S UTC')}"

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
                    "gmail_account": candidate.gmail_account.gmail_email if candidate.gmail_account else None,
                    "email_draft": cand_draft_name,
                    "cv_file_path": candidate.cv_file_path,
                    "employer_id": employer.id,
                    "employer_name": employer.service_name or employer.company_name or "Employer",
                    "employer_email": emp_email,
                    "eligible": can_send,
                    "reason": reason,
                })

            candidate_summaries.append({
                "candidate_id": candidate.id,
                "candidate_name": candidate.full_name,
                "eligible_count": cand_eligible_count,
                "sent_today_count": cand_sent_today,
                "daily_limit": settings.max_emails_per_candidate_per_day,
                "min_gap_minutes": settings.min_gap_minutes,
                "last_sent_at": cand_last_time.isoformat() if cand_last_time else None,
                "next_eligible_at": cand_next_eligible.isoformat() if cand_next_eligible else None,
            })

        # Pagination
        total_items = len(all_items)
        start_offset = (page - 1) * page_size
        end_offset = start_offset + page_size
        paginated_items = all_items[start_offset:end_offset]

        return {
            "items": paginated_items,
            "total": total_items,
            "page": page,
            "page_size": page_size,
            "total_eligible": total_eligible,
            "total_skipped": total_skipped,
            "eligible_today": total_eligible,
            "skipped_count": total_skipped,
            "emails_sent_today": emails_sent_today,
            "candidate_summaries": candidate_summaries,
            "queue_summary": OutreachService.get_outreach_summary(db),
            "settings": {
                "max_emails_per_candidate_per_day": settings.max_emails_per_candidate_per_day,
                "min_gap_minutes": settings.min_gap_minutes,
                "enabled": settings.enabled,
            },
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
        # Atomic Concurrency-Safe Reservation using row locking
        # Row lock on Candidate record to serialize concurrent requests for the same candidate
        candidate = db.scalar(
            select(Candidate).where(Candidate.id == candidate_id).with_for_update()
        )
        if candidate is None:
            raise ValueError("Candidate does not exist")

        can_send, reason = OutreachService.can_send(db, candidate_id, employer_id)
        if not can_send:
            raise ValueError(reason)

        employer = db.get(Employer, employer_id)
        if employer is None:
            raise ValueError("Employer does not exist")

        # Extract draft subject & body if explicit subject/body not provided
        draft_subj, draft_body = extract_draft_content(
            candidate.email_draft if candidate else None,
            candidate.full_name if candidate else "Candidate"
        )
        final_subject = subject.strip() if subject and subject.strip() else draft_subj
        final_body = body.strip() if body and body.strip() else draft_body

        attachment_paths = []
        if candidate and candidate.cv_file_path:
            attachment_paths.append(candidate.cv_file_path)

        # EmailService.send_and_log creates EmailLog with status="pending" inside a short transaction,
        # performs network send outside transaction, and updates status to "sent" or "failed".
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

            candidate = db.get(Candidate, candidate_id)
            employer = db.get(Employer, employer_id)

            if not candidate or not candidate.gmail_account or not employer:
                skipped_count += 1
                continue

            try:
                log = OutreachService.send_outreach(
                    db=db,
                    candidate_id=candidate_id,
                    employer_id=employer_id,
                    gmail_account=candidate.gmail_account,
                    subject=item.get("subject", ""),
                    body=item.get("body", ""),
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
                err_msg = str(e)
                if "limit" in err_msg.lower() or "gap" in err_msg.lower() or "cooldown" in err_msg.lower() or "already" in err_msg.lower():
                    skipped_count += 1
                    results.append({
                        "candidate_id": candidate_id,
                        "employer_id": employer_id,
                        "status": "skipped",
                        "reason": err_msg,
                    })
                else:
                    failed_count += 1
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
    def start_outreach(
        db: Session,
        candidate_id: int | None = None,
    ) -> dict:
        settings = get_outreach_settings(db)
        if not settings.enabled:
            return {
                "success": False,
                "queued": 0,
                "skipped": 0,
                "message": "Automated outreach sending is currently disabled in settings",
            }

        cand_stmt = select(Candidate).where(Candidate.is_active.is_(True)).order_by(Candidate.id)
        if candidate_id is not None:
            cand_stmt = cand_stmt.where(Candidate.id == candidate_id)
        active_candidates = db.scalars(cand_stmt).all()

        active_employers = db.scalars(
            select(Employer).where(Employer.is_active.is_(True)).order_by(Employer.id)
        ).all()

        india_timezone = timezone(timedelta(hours=5, minutes=30))
        now_utc = datetime.now(timezone.utc)
        cooldown_start = now_utc - timedelta(days=3)
        start_of_today = datetime.now(india_timezone).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # 1. Duplicate sent pairs from EmailLog
        sent_pairs = set(
            db.execute(
                select(EmailLog.candidate_id, EmailLog.employer_id).where(
                    EmailLog.status.in_(["sent", "pending", "sending"])
                )
            ).all()
        )

        # 2. Existing pairs from OutreachJob (pending, processing, sent)
        existing_job_pairs = set(
            db.execute(
                select(OutreachJob.candidate_id, OutreachJob.employer_id).where(
                    OutreachJob.status.in_(["pending", "processing", "sent"])
                )
            ).all()
        )

        # 3. Employer 3-day cooldown set
        cooldown_employer_ids = set(
            db.scalars(
                select(EmailLog.employer_id).where(
                    EmailLog.status.in_(["sent", "pending", "sending"]),
                    EmailLog.created_at >= cooldown_start,
                )
            ).all()
        )

        # 4. Count sent today per candidate from EmailLog
        sent_today_rows = db.execute(
            select(EmailLog.candidate_id, func.count(EmailLog.id)).where(
                EmailLog.status.in_(["sent", "pending", "sending"]),
                EmailLog.created_at >= start_of_today,
            ).group_by(EmailLog.candidate_id)
        ).all()
        sent_today_dict = {r[0]: r[1] for r in sent_today_rows}

        # 5. Count queued/sent today per candidate from OutreachJob
        queued_today_rows = db.execute(
            select(OutreachJob.candidate_id, func.count(OutreachJob.id)).where(
                OutreachJob.status.in_(["pending", "processing", "sent"]),
                OutreachJob.created_at >= start_of_today,
            ).group_by(OutreachJob.candidate_id)
        ).all()
        queued_today_dict = {r[0]: r[1] for r in queued_today_rows}

        # 6. Latest created_at from EmailLog per candidate
        latest_log_rows = db.execute(
            select(EmailLog.candidate_id, func.max(EmailLog.created_at)).where(
                EmailLog.status.in_(["sent", "pending", "sending"])
            ).group_by(EmailLog.candidate_id)
        ).all()
        latest_log_dict = {r[0]: r[1] for r in latest_log_rows}

        # 7. Max scheduled_at from OutreachJob per candidate
        max_job_rows = db.execute(
            select(OutreachJob.candidate_id, func.max(OutreachJob.scheduled_at)).where(
                OutreachJob.status.in_(["pending", "processing", "sent"])
            ).group_by(OutreachJob.candidate_id)
        ).all()
        max_job_dict = {r[0]: r[1] for r in max_job_rows}

        total_queued = 0
        total_skipped = 0

        for cand in active_candidates:
            # Candidate readiness checks
            if not cand.is_active or not cand.gmail_account or not cand.gmail_account.is_active or not cand.email_draft_id or not cand.email_draft:
                continue

            sent_cnt = sent_today_dict.get(cand.id, 0)
            queued_cnt = queued_today_dict.get(cand.id, 0)
            total_today = sent_cnt + queued_cnt

            remaining = settings.max_emails_per_candidate_per_day - total_today
            if remaining <= 0:
                continue

            # Calculate initial scheduled_at timestamp for this candidate
            latest_log_time = latest_log_dict.get(cand.id)
            latest_job_time = max_job_dict.get(cand.id)

            cand_last_time = None
            if latest_log_time and latest_job_time:
                cand_last_time = max(latest_log_time, latest_job_time)
            elif latest_log_time:
                cand_last_time = latest_log_time
            elif latest_job_time:
                cand_last_time = latest_job_time

            if cand_last_time:
                if cand_last_time.tzinfo is None:
                    cand_last_time = cand_last_time.replace(tzinfo=timezone.utc)
                next_eligible = cand_last_time + timedelta(minutes=settings.min_gap_minutes)
                candidate_next_send = max(now_utc, next_eligible)
            else:
                candidate_next_send = now_utc

            for emp in active_employers:
                if remaining <= 0:
                    break

                emp_email = (emp.email or "").strip()
                if not emp.is_active or not emp_email or not EMAIL_REGEX.match(emp_email):
                    total_skipped += 1
                    continue
                if (cand.id, emp.id) in sent_pairs or (cand.id, emp.id) in existing_job_pairs:
                    total_skipped += 1
                    continue
                if emp.id in cooldown_employer_ids:
                    total_skipped += 1
                    continue

                # Create OutreachJob
                job = OutreachJob(
                    candidate_id=cand.id,
                    employer_id=emp.id,
                    gmail_account_id=cand.gmail_account.id,
                    scheduled_at=candidate_next_send,
                    status="pending",
                    attempts=0,
                )
                db.add(job)
                existing_job_pairs.add((cand.id, emp.id))

                total_queued += 1
                remaining -= 1
                candidate_next_send = candidate_next_send + timedelta(minutes=settings.min_gap_minutes)

        db.commit()

        return {
            "success": True,
            "queued": total_queued,
            "skipped": total_skipped,
            "message": f"Outreach jobs queued successfully: {total_queued} job(s) scheduled.",
        }

    @staticmethod
    def process_due_outreach_jobs(db: Session, max_jobs: int = 50) -> dict:
        settings = get_outreach_settings(db)
        if not settings.enabled:
            return {"processed": 0, "sent": 0, "skipped": 0, "failed": 0, "reason": "Outreach disabled"}

        now_utc = datetime.now(timezone.utc)

        due_jobs = db.scalars(
            select(OutreachJob)
            .where(
                OutreachJob.status == "pending",
                OutreachJob.scheduled_at <= now_utc,
            )
            .order_by(OutreachJob.scheduled_at.asc())
            .limit(max_jobs)
        ).all()

        processed_cnt = 0
        sent_cnt = 0
        skipped_cnt = 0
        failed_cnt = 0

        for job in due_jobs:
            # Database-level concurrency protection: atomic transition to 'processing'
            res = db.execute(
                update(OutreachJob)
                .where(OutreachJob.id == job.id, OutreachJob.status == "pending")
                .values(
                    status="processing",
                    attempts=OutreachJob.attempts + 1,
                    updated_at=func.now(),
                )
            )
            db.commit()

            if res.rowcount == 0:
                # Job was grabbed by another worker concurrently
                continue

            processed_cnt += 1
            db.refresh(job)

            # Re-verify eligibility before actual send
            can_send, reason = OutreachService.can_send(db, job.candidate_id, job.employer_id)

            if not can_send:
                if reason and "minimum gap" in reason.lower():
                    # Gap restriction: reschedule for next eligible time
                    job.scheduled_at = now_utc + timedelta(minutes=settings.min_gap_minutes)
                    job.status = "pending"
                    job.error_message = reason
                    db.commit()
                    skipped_cnt += 1
                else:
                    # Permanent failure (candidate inactive, cooldown, daily limit reached, duplicate pair)
                    job.status = "skipped"
                    job.error_message = reason
                    db.commit()
                    skipped_cnt += 1
                continue

            # Perform send using connected Gmail account
            cand = db.get(Candidate, job.candidate_id)
            if not cand or not cand.gmail_account:
                job.status = "skipped"
                job.error_message = "Gmail account not connected"
                db.commit()
                skipped_cnt += 1
                continue

            try:
                email_log = OutreachService.send_outreach(
                    db=db,
                    candidate_id=job.candidate_id,
                    employer_id=job.employer_id,
                    gmail_account=cand.gmail_account,
                    subject="",
                    body="",
                )
                if email_log.status == "sent":
                    job.status = "sent"
                    job.email_log_id = email_log.id
                    job.sent_at = datetime.now(timezone.utc)
                    job.error_message = None
                    db.commit()
                    sent_cnt += 1
                else:
                    job.status = "failed"
                    job.error_message = email_log.error_message or "Send failed"
                    db.commit()
                    failed_cnt += 1
            except Exception as exc:
                err_str = str(exc)
                if "limit" in err_str.lower() or "cooldown" in err_str.lower() or "already" in err_str.lower() or "gap" in err_str.lower():
                    job.status = "skipped"
                    job.error_message = err_str
                    skipped_cnt += 1
                else:
                    job.status = "failed"
                    job.error_message = err_str
                    failed_cnt += 1
                db.commit()

        return {
            "processed": processed_cnt,
            "sent": sent_cnt,
            "skipped": skipped_cnt,
            "failed": failed_cnt,
        }

    @staticmethod
    def get_outreach_summary(db: Session) -> dict:
        pending_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(OutreachJob.status == "pending")
        ) or 0

        processing_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(OutreachJob.status == "processing")
        ) or 0

        sent_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(OutreachJob.status == "sent")
        ) or 0

        failed_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(OutreachJob.status == "failed")
        ) or 0

        skipped_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(OutreachJob.status == "skipped")
        ) or 0

        next_job_time = db.scalars(
            select(OutreachJob.scheduled_at)
            .where(OutreachJob.status == "pending")
            .order_by(OutreachJob.scheduled_at.asc())
            .limit(1)
        ).first()

        return {
            "pending_count": pending_cnt,
            "processing_count": processing_cnt,
            "sent_count": sent_cnt,
            "failed_count": failed_cnt,
            "skipped_count": skipped_cnt,
            "next_scheduled_at": next_job_time.isoformat() if next_job_time else None,
        }