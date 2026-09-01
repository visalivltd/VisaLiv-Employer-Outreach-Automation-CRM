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
            subject=subject or "Outreach Email",
            status="pending",
            direction="outgoing",
            body=body,
            snippet=body[:150] if body else "",
        )

        try:
            db.add(email_log)
            db.commit()
            db.refresh(email_log)
        except Exception as exc:
            db.rollback()
            raise RuntimeError(f"Database error creating EmailLog: {exc}") from exc

        try:
            gmail_service = GmailService(
                refresh_token=gmail_account.refresh_token,
            )

            gmail_message_id = gmail_service.send_email(
                to_email=to_email,
                subject=subject,
                body=body,
                sender_email=gmail_account.gmail_email,
                attachment_paths=attachment_paths,
            )

            email_log.status = "sent"
            email_log.sent_at = datetime.now(timezone.utc)
            email_log.gmail_message_id = gmail_message_id
            email_log.body = body
            email_log.snippet = body[:150] if body else ""
            email_log.error_message = None

            db.commit()
            db.refresh(email_log)

            return email_log

        except Exception as exc:
            db.rollback()
            err_str = str(exc)
            is_token_expired = "invalid_grant" in err_str or "Token has been expired or revoked" in err_str
            if is_token_expired:
                try:
                    gmail_account.is_active = False
                    db.commit()
                except Exception:
                    db.rollback()

            try:
                email_log.status = "failed"
                if is_token_expired:
                    email_log.error_message = "Gmail token expired — please reconnect account"
                else:
                    email_log.error_message = err_str
                db.commit()
                db.refresh(email_log)
            except Exception:
                db.rollback()

            raise