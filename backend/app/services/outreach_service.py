import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum

from sqlalchemy import select, func, update
from sqlalchemy.orm import Session

from pathlib import Path

from app.models.candidate import Candidate
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.outreach_job import OutreachJob
from app.repositories.outreach_settings_repository import get_outreach_settings
from app.services.email_draft_service import extract_draft_content
from app.services.email_service import EmailService
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ReasonCode(str, Enum):
    READY = "READY"
    MIN_GAP_WAITING = "MIN_GAP_WAITING"
    DISABLED = "DISABLED"
    CANDIDATE_MISSING = "CANDIDATE_MISSING"
    CANDIDATE_INACTIVE = "CANDIDATE_INACTIVE"
    GMAIL_NOT_CONNECTED = "GMAIL_NOT_CONNECTED"
    DRAFT_MISSING = "DRAFT_MISSING"
    CV_MISSING = "CV_MISSING"
    EMPLOYER_MISSING = "EMPLOYER_MISSING"
    EMPLOYER_INACTIVE = "EMPLOYER_INACTIVE"
    EMPLOYER_EMAIL_INVALID = "EMPLOYER_EMAIL_INVALID"
    DUPLICATE = "DUPLICATE"
    ALREADY_QUEUED = "ALREADY_QUEUED"
    EMPLOYER_COOLDOWN = "EMPLOYER_COOLDOWN"
    DAILY_LIMIT = "DAILY_LIMIT"


@dataclass
class EligibilityResult:
    allowed: bool
    reason_code: ReasonCode
    reason: str
    next_eligible_at: datetime | None = None


class CandidateBatchState:
    """In-memory candidate capacity and schedule state tracker for a batch run."""
    def __init__(
        self,
        candidate_id: int,
        daily_limit: int,
        actual_sent_today: int,
        reserved_pending_today: int,
        next_send_at: datetime,
    ):
        self.candidate_id = candidate_id
        self.daily_limit = daily_limit
        self.actual_sent_today = actual_sent_today
        self.reserved_pending_today = reserved_pending_today
        self.capacity_used = actual_sent_today + reserved_pending_today
        self.next_send_at = next_send_at

    def has_capacity(self) -> bool:
        return self.capacity_used < self.daily_limit

    def consume_slot(self) -> None:
        self.capacity_used += 1


class OutreachService:

    @staticmethod
    def get_start_of_today_ist() -> datetime:
        india_timezone = timezone(timedelta(hours=5, minutes=30))
        return datetime.now(india_timezone).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

    @staticmethod
    def get_candidate_sent_today(db: Session, candidate_id: int, start_of_today: datetime) -> int:
        """Count of unique EmailLogs created today with status sent, pending, or sending."""
        return db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.status.in_(["sent", "pending", "sending"]),
                EmailLog.created_at >= start_of_today,
            )
        ) or 0

    @staticmethod
    def get_candidate_pending_today(
        db: Session,
        candidate_id: int,
        start_of_today: datetime,
        exclude_job_id: int | None = None,
    ) -> int:
        """Count of active pending or processing OutreachJobs created today.
        Note: OutreachJobs with status=='sent' have an associated EmailLog and are NOT double-counted here.
        """
        stmt = select(func.count(OutreachJob.id)).where(
            OutreachJob.candidate_id == candidate_id,
            OutreachJob.status.in_(["pending", "processing"]),
            OutreachJob.created_at >= start_of_today,
        )
        if exclude_job_id is not None:
            stmt = stmt.where(OutreachJob.id != exclude_job_id)
        return db.scalar(stmt) or 0

    @staticmethod
    def get_candidate_latest_activity_time(db: Session, candidate_id: int, exclude_job_id: int | None = None) -> datetime | None:
        latest_log_time = db.scalar(
            select(func.max(EmailLog.created_at)).where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.status.in_(["sent", "pending", "sending"]),
            )
        )
        job_stmt = select(func.max(OutreachJob.scheduled_at)).where(
            OutreachJob.candidate_id == candidate_id,
            OutreachJob.status.in_(["pending", "processing"]),
        )
        if exclude_job_id is not None:
            exclude_job = db.get(OutreachJob, exclude_job_id)
            if exclude_job and exclude_job.scheduled_at:
                job_stmt = job_stmt.where(OutreachJob.scheduled_at < exclude_job.scheduled_at)
            else:
                job_stmt = job_stmt.where(OutreachJob.id != exclude_job_id)

        latest_job_time = db.scalar(job_stmt)

        last_time = None
        if latest_log_time and latest_job_time:
            last_time = max(latest_log_time, latest_job_time)
        elif latest_log_time:
            last_time = latest_log_time
        elif latest_job_time:
            last_time = latest_job_time

        if last_time and last_time.tzinfo is None:
            last_time = last_time.replace(tzinfo=timezone.utc)
        return last_time

    @staticmethod
    def check_eligibility(
        db: Session,
        candidate_id: int,
        employer_id: int,
        now_utc: datetime | None = None,
        custom_capacity_used: int | None = None,
        exclude_job_id: int | None = None,
    ) -> EligibilityResult:
        if now_utc is None:
            now_utc = datetime.now(timezone.utc)
        elif now_utc.tzinfo is None:
            now_utc = now_utc.replace(tzinfo=timezone.utc)

        settings = get_outreach_settings(db)
        if not settings.enabled:
            return EligibilityResult(False, ReasonCode.DISABLED, "Automated outreach sending is currently disabled in settings")

        candidate = db.get(Candidate, candidate_id)
        if candidate is None:
            return EligibilityResult(False, ReasonCode.CANDIDATE_MISSING, "Candidate does not exist")
        if not candidate.is_active:
            return EligibilityResult(False, ReasonCode.CANDIDATE_INACTIVE, "Candidate is inactive")
        if not candidate.gmail_account or not candidate.gmail_account.is_active:
            return EligibilityResult(False, ReasonCode.GMAIL_NOT_CONNECTED, "Gmail account not connected or inactive")
        if not candidate.email_draft_id or not candidate.email_draft:
            return EligibilityResult(False, ReasonCode.DRAFT_MISSING, "Email draft not assigned to candidate")

        employer = db.get(Employer, employer_id)
        if employer is None:
            return EligibilityResult(False, ReasonCode.EMPLOYER_MISSING, "Employer does not exist")
        if not employer.is_active:
            return EligibilityResult(False, ReasonCode.EMPLOYER_INACTIVE, "Employer is inactive")

        emp_email = (employer.email or "").strip()
        if not emp_email or not EMAIL_REGEX.match(emp_email):
            return EligibilityResult(False, ReasonCode.EMPLOYER_EMAIL_INVALID, "Invalid employer email address")

        # 4. Duplicate Pair Check
        previous_email = db.scalar(
            select(EmailLog).where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.employer_id == employer_id,
                EmailLog.status.in_(["sent", "pending", "sending"]),
            )
        )
        if previous_email:
            return EligibilityResult(False, ReasonCode.DUPLICATE, "Already contacted by this candidate")

        # Active Queued OutreachJob Check
        job_stmt = select(OutreachJob).where(
            OutreachJob.candidate_id == candidate_id,
            OutreachJob.employer_id == employer_id,
            OutreachJob.status.in_(["pending", "processing"]),
        )
        if exclude_job_id is not None:
            job_stmt = job_stmt.where(OutreachJob.id != exclude_job_id)

        previous_job = db.scalar(job_stmt)
        if previous_job:
            sched_str = previous_job.scheduled_at.strftime("%H:%M UTC") if previous_job.scheduled_at else ""
            return EligibilityResult(False, ReasonCode.ALREADY_QUEUED, f"Already queued for outreach ({sched_str})")

        # 5. Employer-Level 3-Day Cooldown Check
        cooldown_start = now_utc - timedelta(days=3)
        recent_cooldown_email = db.scalar(
            select(EmailLog.id).where(
                EmailLog.employer_id == employer_id,
                EmailLog.status.in_(["sent", "pending", "sending"]),
                EmailLog.created_at >= cooldown_start,
            )
        )
        if recent_cooldown_email:
            return EligibilityResult(False, ReasonCode.EMPLOYER_COOLDOWN, "Employer in 3-day cooldown")

        job_cooldown_stmt = select(OutreachJob.id).where(
            OutreachJob.employer_id == employer_id,
            OutreachJob.status.in_(["pending", "processing"]),
        )
        if exclude_job_id is not None:
            job_cooldown_stmt = job_cooldown_stmt.where(OutreachJob.id != exclude_job_id)

        recent_cooldown_job = db.scalar(job_cooldown_stmt)
        if recent_cooldown_job:
            return EligibilityResult(False, ReasonCode.EMPLOYER_COOLDOWN, "Employer in 3-day cooldown (queued for outreach)")

        # 6. Daily Limit Check
        if custom_capacity_used is not None:
            capacity_used = custom_capacity_used
        else:
            start_of_today = OutreachService.get_start_of_today_ist()
            sent_today = OutreachService.get_candidate_sent_today(db, candidate_id, start_of_today)
            pending_today = OutreachService.get_candidate_pending_today(db, candidate_id, start_of_today, exclude_job_id=exclude_job_id)
            capacity_used = sent_today + pending_today

        if capacity_used >= settings.max_emails_per_candidate_per_day:
            return EligibilityResult(
                False,
                ReasonCode.DAILY_LIMIT,
                f"Daily limit reached — maximum {settings.max_emails_per_candidate_per_day} emails/day per candidate",
            )

        # 7. Minimum Gap Check
        last_time = OutreachService.get_candidate_latest_activity_time(db, candidate_id, exclude_job_id=exclude_job_id)
        next_eligible = None
        if last_time:
            next_eligible = last_time + timedelta(minutes=settings.min_gap_minutes)

        if next_eligible and next_eligible > now_utc:
            return EligibilityResult(
                allowed=True,
                reason_code=ReasonCode.MIN_GAP_WAITING,
                reason=f"Minimum gap waiting — Next eligible send: {next_eligible.strftime('%H:%M:%S UTC')}",
                next_eligible_at=next_eligible,
            )

        return EligibilityResult(
            allowed=True,
            reason_code=ReasonCode.READY,
            reason="Ready",
            next_eligible_at=now_utc,
        )

    @staticmethod
    def can_send(
        db: Session,
        candidate_id: int,
        employer_id: int,
        exclude_job_id: int | None = None,
    ) -> tuple[bool, str | None]:
        res = OutreachService.check_eligibility(db, candidate_id, employer_id, exclude_job_id=exclude_job_id)
        if not res.allowed or res.reason_code == ReasonCode.MIN_GAP_WAITING:
            return False, res.reason
        return True, None

    @staticmethod
    def get_outreach_preview(
        db: Session,
        page: int = 1,
        page_size: int = 50,
        candidate_id: int | None = None,
        only_eligible: bool = False,
    ) -> dict:
        settings = get_outreach_settings(db)
        now_utc = datetime.now(timezone.utc)
        start_of_today = OutreachService.get_start_of_today_ist()

        candidate_stmt = select(Candidate).where(Candidate.is_active.is_(True)).order_by(Candidate.id)
        if candidate_id is not None:
            candidate_stmt = candidate_stmt.where(Candidate.id == candidate_id)
        active_candidates = db.scalars(candidate_stmt).all()

        total_employers = db.scalar(
            select(func.count(Employer.id)).where(Employer.is_active.is_(True))
        ) or 0

        start_offset = (page - 1) * page_size
        paginated_employers = db.scalars(
            select(Employer)
            .where(Employer.is_active.is_(True))
            .order_by(Employer.id)
            .offset(start_offset)
            .limit(page_size)
        ).all()

        emails_sent_today = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.status == "sent",
                EmailLog.sent_at >= start_of_today,
            )
        ) or 0

        all_items = []
        candidate_summaries = []
        total_eligible = 0
        total_skipped = 0
        global_preview_assigned_employers: set[int] = set()

        for candidate in active_candidates:
            cand_sent_today = OutreachService.get_candidate_sent_today(db, candidate.id, start_of_today)
            cand_queued_today = OutreachService.get_candidate_pending_today(db, candidate.id, start_of_today)
            cand_last_time = OutreachService.get_candidate_latest_activity_time(db, candidate.id)
            cand_next_eligible = (
                cand_last_time + timedelta(minutes=settings.min_gap_minutes) if cand_last_time else None
            )

            cand_draft_name = candidate.email_draft_name or (
                candidate.email_draft.draft_name if candidate.email_draft else None
            )

            # Fast set lookups to eliminate N*M database queries per request
            contacted_set = set(
                db.scalars(
                    select(EmailLog.employer_id).where(
                        EmailLog.candidate_id == candidate.id,
                        EmailLog.status.in_(["sent", "pending", "sending"]),
                    )
                ).all()
            )

            queued_set = set(
                db.scalars(
                    select(OutreachJob.employer_id).where(
                        OutreachJob.candidate_id == candidate.id,
                        OutreachJob.status.in_(["pending", "processing"]),
                    )
                ).all()
            )

            cooldown_start = now_utc - timedelta(days=3)
            cooldown_emails = set(
                db.scalars(
                    select(EmailLog.employer_id).where(
                        EmailLog.status.in_(["sent", "pending", "sending"]),
                        EmailLog.created_at >= cooldown_start,
                    )
                ).all()
            )
            cooldown_jobs = set(
                db.scalars(
                    select(OutreachJob.employer_id).where(
                        OutreachJob.status.in_(["pending", "processing"]),
                    )
                ).all()
            )
            cooldown_set = cooldown_emails | cooldown_jobs | global_preview_assigned_employers

            cand_valid = (
                settings.enabled
                and candidate.is_active
                and candidate.gmail_account
                and candidate.gmail_account.is_active
                and candidate.email_draft_id
                and candidate.email_draft
            )

            capacity_used = cand_sent_today + cand_queued_today
            cand_remaining_quota = max(0, settings.max_emails_per_candidate_per_day - capacity_used)
            daily_limit_reached = cand_remaining_quota <= 0
            is_min_gap_waiting = cand_next_eligible and cand_next_eligible > now_utc

            ineligible_set = contacted_set | queued_set | cooldown_set
            if not cand_valid or daily_limit_reached:
                cand_eligible_count = 0
                cand_skipped_count = total_employers
            else:
                cand_skipped_count = len(ineligible_set)
                cand_eligible_count = max(0, total_employers - cand_skipped_count)

            total_eligible += cand_eligible_count
            total_skipped += cand_skipped_count

            # Determine list of employers to evaluate:
            # If only_eligible or filtering a specific candidate, skip contacted/cooldown employers automatically
            if only_eligible or candidate_id is not None:
                emp_stmt = (
                    select(Employer)
                    .where(
                        Employer.is_active.is_(True),
                        Employer.email.isnot(None),
                        Employer.email != "",
                    )
                    .order_by(Employer.id)
                )
                if ineligible_set:
                    emp_stmt = emp_stmt.where(Employer.id.notin_(ineligible_set))
                cand_employers = db.scalars(emp_stmt.offset(start_offset).limit(page_size)).all()
            else:
                cand_employers = paginated_employers

            # Fast paginated evaluation for requested employers
            for employer in cand_employers:
                emp_email = (employer.email or "").strip()

                if not cand_valid:
                    res = EligibilityResult(False, ReasonCode.CANDIDATE_MISSING, "Candidate missing, inactive, or draft/Gmail missing")
                elif not employer.is_active:
                    res = EligibilityResult(False, ReasonCode.EMPLOYER_INACTIVE, "Employer is inactive")
                elif not emp_email or not EMAIL_REGEX.match(emp_email):
                    res = EligibilityResult(False, ReasonCode.EMPLOYER_EMAIL_INVALID, "Invalid employer email address")
                elif employer.id in contacted_set:
                    res = EligibilityResult(False, ReasonCode.DUPLICATE, "Already contacted by this candidate")
                elif employer.id in queued_set:
                    res = EligibilityResult(False, ReasonCode.ALREADY_QUEUED, "Already queued for outreach")
                elif employer.id in cooldown_set:
                    res = EligibilityResult(False, ReasonCode.EMPLOYER_COOLDOWN, "Employer in 3-day cooldown")
                elif cand_remaining_quota <= 0:
                    res = EligibilityResult(False, ReasonCode.DAILY_LIMIT, f"Daily limit reached — maximum {settings.max_emails_per_candidate_per_day} emails/day per candidate")
                elif is_min_gap_waiting:
                    res = EligibilityResult(True, ReasonCode.MIN_GAP_WAITING, f"Minimum gap waiting — Next eligible send: {cand_next_eligible.strftime('%H:%M:%S UTC')}", cand_next_eligible)
                else:
                    res = EligibilityResult(True, ReasonCode.READY, "Ready", now_utc)

                is_eligible = res.allowed or res.reason_code == ReasonCode.MIN_GAP_WAITING
                if is_eligible and cand_remaining_quota > 0:
                    cand_remaining_quota -= 1
                    global_preview_assigned_employers.add(employer.id)

                all_items.append({
                    "candidate_id": candidate.id,
                    "candidate_name": candidate.full_name,
                    "candidate_email": candidate.email,
                    "gmail_account": candidate.gmail_account.gmail_email if candidate.gmail_account else None,
                    "email_draft": cand_draft_name,
                    "cv_file_path": candidate.cv_file_path,
                    "employer_id": employer.id,
                    "employer_name": employer.service_name or getattr(employer, "company_name", None) or "Employer",
                    "employer_email": emp_email,
                    "eligible": is_eligible,
                    "reason": res.reason,
                    "reason_code": res.reason_code.value,
                })

            candidate_summaries.append({
                "candidate_id": candidate.id,
                "candidate_name": candidate.full_name,
                "eligible_count": cand_eligible_count,
                "sent_today_count": cand_sent_today,
                "queued_today_count": cand_queued_today,
                "daily_limit": settings.max_emails_per_candidate_per_day,
                "min_gap_minutes": settings.min_gap_minutes,
                "last_sent_at": cand_last_time.isoformat() if cand_last_time else None,
                "next_eligible_at": cand_next_eligible.isoformat() if cand_next_eligible else None,
            })

        return {
            "items": all_items,
            "total": total_employers * len(active_candidates) if active_candidates else 0,
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
        exclude_job_id: int | None = None,
    ) -> EmailLog:
        # Atomic Concurrency-Safe Reservation using row locking on Candidate
        candidate = db.scalar(
            select(Candidate).where(Candidate.id == candidate_id).with_for_update()
        )
        if candidate is None:
            raise ValueError("Candidate does not exist")

        can_send, reason = OutreachService.can_send(db, candidate_id, employer_id, exclude_job_id=exclude_job_id)
        if not can_send:
            raise ValueError(reason)

        employer = db.get(Employer, employer_id)
        if employer is None:
            raise ValueError("Employer does not exist")

        draft_subj, draft_body = extract_draft_content(
            candidate.email_draft if candidate else None,
            candidate.full_name if candidate else "Candidate"
        )
        final_subject = subject.strip() if subject and subject.strip() else draft_subj
        final_body = body.strip() if body and body.strip() else draft_body

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
        settings = get_outreach_settings(db)
        now_utc = datetime.now(timezone.utc)
        start_of_today = OutreachService.get_start_of_today_ist()

        sent_count = 0
        queued_count = 0
        failed_count = 0
        skipped_count = 0
        results = []

        cand_states: dict[int, CandidateBatchState] = {}
        processed_employers_in_batch: set[int] = set()

        # Pre-group candidate IDs to apply concurrency row locks
        candidate_ids = sorted(list({item.get("candidate_id") for item in items if item.get("candidate_id")}))
        if candidate_ids:
            # Lock candidates in order to prevent deadlock & race conditions
            locked_cands = db.scalars(
                select(Candidate).where(Candidate.id.in_(candidate_ids)).with_for_update().order_by(Candidate.id)
            ).all()

        for item in items:
            candidate_id = item.get("candidate_id")
            employer_id = item.get("employer_id")

            if not candidate_id or not employer_id:
                skipped_count += 1
                continue

            if employer_id in processed_employers_in_batch:
                skipped_count += 1
                results.append({
                    "candidate_id": candidate_id,
                    "employer_id": employer_id,
                    "status": "skipped",
                    "reason": "Employer in 3-day cooldown (assigned in current batch)",
                    "reason_code": ReasonCode.EMPLOYER_COOLDOWN.value,
                })
                continue

            # Initialize candidate state if not present
            if candidate_id not in cand_states:
                cand = db.get(Candidate, candidate_id)
                if not cand or not cand.is_active or not cand.gmail_account or not cand.gmail_account.is_active:
                    skipped_count += 1
                    results.append({
                        "candidate_id": candidate_id,
                        "employer_id": employer_id,
                        "status": "skipped",
                        "reason": "Candidate missing, inactive, or Gmail account not connected",
                        "reason_code": ReasonCode.CANDIDATE_MISSING.value,
                    })
                    continue

                actual_sent = OutreachService.get_candidate_sent_today(db, candidate_id, start_of_today)
                reserved_pending = OutreachService.get_candidate_pending_today(db, candidate_id, start_of_today)
                last_activity = OutreachService.get_candidate_latest_activity_time(db, candidate_id)

                if last_activity:
                    next_eligible = last_activity + timedelta(minutes=settings.min_gap_minutes)
                    initial_next_send = max(now_utc, next_eligible)
                else:
                    initial_next_send = now_utc

                cand_states[candidate_id] = CandidateBatchState(
                    candidate_id=candidate_id,
                    daily_limit=settings.max_emails_per_candidate_per_day,
                    actual_sent_today=actual_sent,
                    reserved_pending_today=reserved_pending,
                    next_send_at=initial_next_send,
                )

            state = cand_states.get(candidate_id)
            if not state:
                skipped_count += 1
                continue

            # 1. Check eligibility with candidate's in-flight capacity usage
            res = OutreachService.check_eligibility(
                db=db,
                candidate_id=candidate_id,
                employer_id=employer_id,
                now_utc=now_utc,
                custom_capacity_used=state.capacity_used,
            )

            if not res.allowed:
                skipped_count += 1
                results.append({
                    "candidate_id": candidate_id,
                    "employer_id": employer_id,
                    "status": "skipped",
                    "reason": res.reason,
                    "reason_code": res.reason_code.value,
                })
                continue

            # 2. Check scheduled slot & immediate send feasibility
            scheduled_time = state.next_send_at
            is_immediate = scheduled_time <= now_utc + timedelta(seconds=2)

            candidate = db.get(Candidate, candidate_id)

            if is_immediate:
                state.next_send_at = now_utc + timedelta(minutes=settings.min_gap_minutes)
                try:
                    log = OutreachService.send_outreach(
                        db=db,
                        candidate_id=candidate_id,
                        employer_id=employer_id,
                        gmail_account=candidate.gmail_account,
                        subject=item.get("subject", ""),
                        body=item.get("body", ""),
                    )
                    state.consume_slot()
                    if log.status == "sent":
                        sent_count += 1
                        processed_employers_in_batch.add(employer_id)
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
                    failed_count += 1
                    state.consume_slot()
                    results.append({
                        "candidate_id": candidate_id,
                        "employer_id": employer_id,
                        "status": "failed",
                        "error": err_msg,
                    })
            else:
                # Slot is scheduled in future -> Queue OutreachJob
                job = OutreachJob(
                    candidate_id=candidate_id,
                    employer_id=employer_id,
                    gmail_account_id=candidate.gmail_account.id,
                    scheduled_at=scheduled_time,
                    status="pending",
                    attempts=0,
                )
                db.add(job)
                db.commit()

                queued_count += 1
                processed_employers_in_batch.add(employer_id)
                state.consume_slot()
                state.next_send_at = scheduled_time + timedelta(minutes=settings.min_gap_minutes)

                results.append({
                    "candidate_id": candidate_id,
                    "employer_id": employer_id,
                    "status": "queued",
                    "job_id": job.id,
                    "scheduled_at": scheduled_time.isoformat(),
                })

        logger.info(
            "Outreach batch execution summary: submitted=%d, sent=%d, queued=%d, failed=%d, skipped=%d",
            len(items), sent_count, queued_count, failed_count, skipped_count
        )

        return {
            "sent": sent_count,
            "queued": queued_count,
            "failed": failed_count,
            "skipped": skipped_count,
            "sent_count": sent_count,
            "queued_count": queued_count,
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

        now_utc = datetime.now(timezone.utc)
        start_of_today = OutreachService.get_start_of_today_ist()

        total_queued = 0
        total_skipped = 0
        queued_in_run_employer_ids: set[int] = set()

        for cand in active_candidates:
            if not cand.is_active or not cand.gmail_account or not cand.gmail_account.is_active or not cand.email_draft_id or not cand.email_draft:
                continue

            actual_sent = OutreachService.get_candidate_sent_today(db, cand.id, start_of_today)
            reserved_pending = OutreachService.get_candidate_pending_today(db, cand.id, start_of_today)
            capacity_used = actual_sent + reserved_pending
            remaining = max(0, settings.max_emails_per_candidate_per_day - capacity_used)

            if remaining <= 0:
                continue

            last_time = OutreachService.get_candidate_latest_activity_time(db, cand.id)
            if last_time:
                next_eligible = last_time + timedelta(minutes=settings.min_gap_minutes)
                candidate_next_send = max(now_utc, next_eligible)
            else:
                candidate_next_send = now_utc

            for emp in active_employers:
                if remaining <= 0:
                    break

                if emp.id in queued_in_run_employer_ids:
                    total_skipped += 1
                    continue

                res = OutreachService.check_eligibility(
                    db=db,
                    candidate_id=cand.id,
                    employer_id=emp.id,
                    now_utc=now_utc,
                    custom_capacity_used=settings.max_emails_per_candidate_per_day - remaining,
                )

                if not res.allowed:
                    total_skipped += 1
                    continue

                job = OutreachJob(
                    candidate_id=cand.id,
                    employer_id=emp.id,
                    gmail_account_id=cand.gmail_account.id,
                    scheduled_at=candidate_next_send,
                    status="pending",
                    attempts=0,
                )
                db.add(job)
                db.flush()
                queued_in_run_employer_ids.add(emp.id)

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
    def reschedule_pending_jobs(db: Session, min_gap_minutes: int | None = None) -> int:
        if min_gap_minutes is None:
            settings = get_outreach_settings(db)
            min_gap_minutes = settings.min_gap_minutes

        pending_jobs = db.scalars(
            select(OutreachJob)
            .where(OutreachJob.status == "pending")
            .order_by(OutreachJob.candidate_id, OutreachJob.scheduled_at.asc(), OutreachJob.id.asc())
        ).all()

        if not pending_jobs:
            return 0

        from collections import defaultdict
        cand_jobs = defaultdict(list)
        for job in pending_jobs:
            cand_jobs[job.candidate_id].append(job)

        now_utc = datetime.now(timezone.utc)
        updated_count = 0

        for cand_id, jobs in cand_jobs.items():
            latest_log = db.scalar(
                select(EmailLog)
                .where(
                    EmailLog.candidate_id == cand_id,
                    EmailLog.status.in_(["sent", "pending", "sending"]),
                )
                .order_by(EmailLog.created_at.desc())
            )
            last_time = None
            if latest_log:
                last_time = latest_log.sent_at or latest_log.created_at
                if last_time and last_time.tzinfo is None:
                    last_time = last_time.replace(tzinfo=timezone.utc)

            if last_time:
                next_eligible = last_time + timedelta(minutes=min_gap_minutes)
                current_next_send = max(now_utc, next_eligible)
            else:
                current_next_send = now_utc

            for job in jobs:
                job.scheduled_at = current_next_send
                current_next_send = current_next_send + timedelta(minutes=min_gap_minutes)
                updated_count += 1

        db.commit()
        return updated_count

    @staticmethod
    def find_next_eligible_employer_for_candidate(
        db: Session,
        candidate_id: int,
        now_utc: datetime | None = None,
    ) -> int | None:
        if now_utc is None:
            now_utc = datetime.now(timezone.utc)

        contacted_set = set(
            db.scalars(
                select(EmailLog.employer_id).where(
                    EmailLog.candidate_id == candidate_id,
                    EmailLog.status.in_(["sent", "pending", "sending"]),
                )
            ).all()
        )

        queued_set = set(
            db.scalars(
                select(OutreachJob.employer_id).where(
                    OutreachJob.candidate_id == candidate_id,
                    OutreachJob.status.in_(["pending", "processing"]),
                )
            ).all()
        )

        cooldown_start = now_utc - timedelta(days=3)
        cooldown_emails = set(
            db.scalars(
                select(EmailLog.employer_id).where(
                    EmailLog.status.in_(["sent", "pending", "sending"]),
                    EmailLog.created_at >= cooldown_start,
                )
            ).all()
        )
        cooldown_jobs = set(
            db.scalars(
                select(OutreachJob.employer_id).where(
                    OutreachJob.status.in_(["pending", "processing"]),
                )
            ).all()
        )
        cooldown_set = cooldown_emails | cooldown_jobs

        excluded_set = contacted_set | queued_set | cooldown_set

        stmt = (
            select(Employer.id)
            .where(
                Employer.is_active.is_(True),
                Employer.email.isnot(None),
                Employer.email != "",
            )
            .order_by(Employer.id)
        )
        if excluded_set:
            stmt = stmt.where(Employer.id.notin_(excluded_set))

        candidate_employers = db.scalars(stmt).all()
        for emp_id in candidate_employers:
            emp = db.get(Employer, emp_id)
            if emp and emp.email and EMAIL_REGEX.match(emp.email.strip()):
                return emp_id

        return None

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
            # Atomic transition to 'processing'
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
                # Concurrent worker grabbed job
                continue

            processed_cnt += 1
            db.refresh(job)

            # Re-verify eligibility using structured engine
            eligibility = OutreachService.check_eligibility(db, job.candidate_id, job.employer_id, now_utc=now_utc, exclude_job_id=job.id)

            if eligibility.reason_code == ReasonCode.MIN_GAP_WAITING:
                # Temporary gap restriction: reschedule to pending for next worker poll
                job.scheduled_at = max(now_utc, eligibility.next_eligible_at or (now_utc + timedelta(minutes=settings.min_gap_minutes)))
                job.status = "pending"
                job.error_message = eligibility.reason
                db.commit()
                skipped_cnt += 1
                continue
            elif eligibility.reason_code == ReasonCode.DAILY_LIMIT:
                # Daily limit reached for today: reschedule to tomorrow's quota instead of skipping
                start_tomorrow = OutreachService.get_start_of_today_ist() + timedelta(days=1)
                job.scheduled_at = start_tomorrow
                job.status = "pending"
                job.error_message = eligibility.reason
                db.commit()
                skipped_cnt += 1
                continue
            elif not eligibility.allowed:
                # Smart Auto-Replacement: If assigned employer entered 3-day cooldown or was contacted,
                # auto-assign next available free & eligible employer for candidate instead of wasting slot.
                replacement_emp_id = OutreachService.find_next_eligible_employer_for_candidate(
                    db, job.candidate_id, now_utc=now_utc
                )
                if replacement_emp_id:
                    job.employer_id = replacement_emp_id
                    eligibility = OutreachService.check_eligibility(
                        db, job.candidate_id, replacement_emp_id, now_utc=now_utc, exclude_job_id=job.id
                    )

            if not eligibility.allowed:
                # Permanent eligibility violation -> mark skipped
                job.status = "skipped"
                job.error_message = eligibility.reason
                db.commit()
                skipped_cnt += 1
                continue

            # Execute send via connected Gmail account
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
                    exclude_job_id=job.id,
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
            except ValueError as exc:
                job.status = "skipped"
                job.error_message = str(exc)
                db.commit()
                skipped_cnt += 1
            except Exception as exc:
                err_str = str(exc)
                if "invalid_grant" in err_str or "Token has been expired or revoked" in err_str or "Gmail token expired" in err_str:
                    job.status = "skipped"
                    job.error_message = "Gmail token expired — please reconnect account"
                    db.commit()
                    skipped_cnt += 1
                else:
                    job.status = "failed"
                    job.error_message = err_str
                    db.commit()
                    failed_cnt += 1

        return {
            "processed": processed_cnt,
            "sent": sent_cnt,
            "skipped": skipped_cnt,
            "failed": failed_cnt,
        }

    @staticmethod
    def get_outreach_summary(db: Session) -> dict:
        start_of_today = OutreachService.get_start_of_today_ist()

        pending_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(OutreachJob.status == "pending")
        ) or 0

        processing_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(OutreachJob.status == "processing")
        ) or 0

        sent_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(
                OutreachJob.status == "sent",
                OutreachJob.created_at >= start_of_today,
            )
        ) or 0

        failed_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(
                OutreachJob.status == "failed",
                OutreachJob.created_at >= start_of_today,
            )
        ) or 0

        skipped_cnt = db.scalar(
            select(func.count(OutreachJob.id)).where(
                OutreachJob.status == "skipped",
                OutreachJob.created_at >= start_of_today,
            )
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

    @staticmethod
    def cancel_pending_jobs(db: Session, candidate_id: int | None = None) -> dict:
        stmt = select(OutreachJob).where(OutreachJob.status == "pending")
        if candidate_id is not None:
            stmt = stmt.where(OutreachJob.candidate_id == candidate_id)
        pending_jobs = db.scalars(stmt).all()

        cancelled_count = 0
        for job in pending_jobs:
            job.status = "cancelled"
            job.error_message = "Cancelled by user"
            cancelled_count += 1

        db.commit()
        return {
            "success": True,
            "cancelled_count": cancelled_count,
            "message": f"Cancelled {cancelled_count} pending outreach job(s).",
        }
