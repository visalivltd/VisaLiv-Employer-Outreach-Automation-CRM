from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.candidate import Candidate
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.services.gmail_service import GmailService

router = APIRouter(
    prefix="/email-tracking",
    tags=["Email Tracking"],
)


class SendEmailTrackingRequest(BaseModel):
    candidate_id: int
    to_email: str
    subject: str
    body: str
    employer_id: int | None = None
    thread_id: str | None = None
    attach_cv: bool = True
    custom_attachment_paths: list[str] | None = None


@router.post("/send")
def send_email_from_tracking(
    req: SendEmailTrackingRequest,
    db: Session = Depends(get_db),
):
    candidate = db.get(Candidate, req.candidate_id)
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    gmail_account = db.scalar(
        select(GmailAccount).where(
            GmailAccount.candidate_id == candidate.id,
            GmailAccount.is_active.is_(True),
        )
    )
    if not gmail_account or not gmail_account.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate {candidate.full_name} has no connected active Gmail account.",
        )

    # Validate Gmail sending scope permission
    from app.api.v1.gmail_account import check_account_send_scope
    if not check_account_send_scope(gmail_account):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GMAIL_SEND_SCOPE_MISSING: Gmail sending permission is missing for candidate {candidate.full_name} ({gmail_account.gmail_email}). Please reconnect this Gmail account to enable sending.",
        )

    to_email_clean = (req.to_email or "").strip()
    if not to_email_clean or "@" not in to_email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid recipient email address is required.",
        )

    print("[REPLY DEBUG] Send Email Request Received:", flush=True)
    print(f"  Candidate: {candidate.full_name} (#{candidate.id})", flush=True)
    print(f"  Candidate Email: {candidate.email}", flush=True)
    print(f"  Gmail Account ID: {gmail_account.id}", flush=True)
    print(f"  Gmail Account Email: {gmail_account.gmail_email}", flush=True)
    print(f"  Employer Email: {to_email_clean}", flush=True)
    print(f"  Thread ID: {req.thread_id}", flush=True)

    # Find or associate Employer
    employer = None
    if req.employer_id:
        employer = db.get(Employer, req.employer_id)

    if not employer:
        employer = db.scalar(
            select(Employer).where(Employer.email.ilike(to_email_clean))
        )

    if not employer:
        emp_name = to_email_clean.split("@")[0].replace(".", " ").title()
        employer = Employer(
            service_name=emp_name,
            email=to_email_clean,
            is_active=True,
        )
        db.add(employer)
        db.commit()
        db.refresh(employer)

    # Prepare attachments
    attachments = []
    if req.attach_cv and candidate.cv_file_path:
        attachments.append(candidate.cv_file_path)

    if req.custom_attachment_paths:
        for p in req.custom_attachment_paths:
            if p and p not in attachments:
                attachments.append(p)

    # Create pending outgoing EmailLog
    email_log = EmailLog(
        candidate_id=candidate.id,
        employer_id=employer.id,
        gmail_account_id=gmail_account.id,
        subject=req.subject or "Direct Outreach Email",
        status="pending",
        direction="outgoing",
        body=req.body,
        snippet=req.body[:150] if req.body else "",
        gmail_thread_id=req.thread_id,
    )
    db.add(email_log)
    db.commit()
    db.refresh(email_log)

    try:
        gmail_service = GmailService(refresh_token=gmail_account.refresh_token)
        msg_id = gmail_service.send_email(
            to_email=to_email_clean,
            subject=req.subject,
            body=req.body,
            sender_email=gmail_account.gmail_email,
            attachment_paths=attachments if attachments else None,
            thread_id=req.thread_id,
        )

        email_log.status = "sent"
        email_log.sent_at = datetime.now(timezone.utc)
        email_log.gmail_message_id = msg_id
        email_log.gmail_thread_id = req.thread_id or msg_id
        email_log.body = req.body
        email_log.snippet = req.body[:150] if req.body else ""
        email_log.error_message = None
        db.commit()
        db.refresh(email_log)

        print("[GMAIL MAPPING DEBUG] Outreach Email Sent & Saved:", flush=True)
        print(f"  Account Email: {gmail_account.gmail_email}", flush=True)
        print(f"  Gmail MsgId: {msg_id}", flush=True)
        print(f"  Gmail ThreadId: {email_log.gmail_thread_id}", flush=True)
        print(f"  Direction: outgoing", flush=True)
        print(f"  From: {gmail_account.gmail_email}", flush=True)
        print(f"  To: {to_email_clean}", flush=True)
        print(f"  Subject: {req.subject}", flush=True)
        print(f"  DB EmailLog ID: #{email_log.id}", flush=True)

        return {
            "success": True,
            "message": "Email sent successfully",
            "gmail_message_id": msg_id,
            "gmail_thread_id": email_log.gmail_thread_id,
            "email_log_id": email_log.id,
            "candidate_id": candidate.id,
            "employer_id": employer.id,
            "employer_email": employer.email,
            "employer_name": employer.service_name,
            "subject": req.subject,
            "body": req.body,
            "sent_at": email_log.sent_at.isoformat(),
        }

    except Exception as exc:
        db.rollback()
        email_log.status = "failed"
        email_log.error_message = str(exc)
        try:
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send email: {exc}",
        ) from exc
