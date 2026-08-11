from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.email_log import EmailLog
from app.models.gmail_account import GmailAccount
from app.models.employer import Employer
from app.services.email_service import EmailService


class OutreachService:

    @staticmethod
    def can_send(
        db: Session,
        candidate_id: int,
        employer_id: int,
    ) -> tuple[bool, str | None]:

        # Rule 1:
        # Same student must never email the same employer twice.
        previous_email = db.scalar(
            select(EmailLog).where(
                EmailLog.candidate_id == candidate_id,
                EmailLog.employer_id == employer_id,
                EmailLog.status == "sent",
            )
        )

        if previous_email:
            return False, "Student already emailed this employer"

        # Rule 2:
        # Employer cannot receive email from ANY student
        # for 3 days after the last successful email.
        cooldown_start = datetime.now(timezone.utc) - timedelta(days=3)

        recent_email = db.scalar(
            select(EmailLog)
            .where(
                EmailLog.employer_id == employer_id,
                EmailLog.status == "sent",
                EmailLog.sent_at >= cooldown_start,
            )
            .order_by(EmailLog.sent_at.desc())
        )

        if recent_email:
            return False, "Employer is in 3-day cooldown"

        return True, None

    @staticmethod
    def send_outreach(
        db: Session,
        candidate_id: int,
        employer_id: int,
        gmail_account: GmailAccount,
        subject: str,
        body: str,
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

        return EmailService.send_and_log(
            db=db,
            candidate_id=candidate_id,
            employer_id=employer_id,
            gmail_account=gmail_account,
            to_email=employer.email,
            subject=subject,
            body=body,
        )