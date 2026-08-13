from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.email_log import EmailLog
from app.models.gmail_account import GmailAccount
from app.services.gmail_service import GmailService


class EmailService:

    @staticmethod
    def send_and_log(
        db: Session,
        candidate_id: int,
        employer_id: int,
        gmail_account: GmailAccount,
        to_email: str,
        subject: str,
        body: str,
        attachment_paths: list[str] | None = None,
    ) -> EmailLog:

        email_log = EmailLog(
            candidate_id=candidate_id,
            employer_id=employer_id,
            gmail_account_id=gmail_account.id,
            subject=subject,
            status="pending",
        )

        db.add(email_log)
        db.commit()
        db.refresh(email_log)

        try:
            gmail_service = GmailService(
                refresh_token=gmail_account.refresh_token,
            )

            gmail_service.send_email(
                to_email=to_email,
                subject=subject,
                body=body,
                attachment_paths=attachment_paths,
            )

            email_log.status = "sent"
            email_log.sent_at = datetime.now(timezone.utc)
            email_log.error_message = None

            db.commit()
            db.refresh(email_log)

            return email_log

        except Exception as exc:
            email_log.status = "failed"
            email_log.error_message = str(exc)

            db.commit()
            db.refresh(email_log)

            raise