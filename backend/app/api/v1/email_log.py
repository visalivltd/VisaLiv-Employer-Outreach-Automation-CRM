from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.email_log import EmailLog

router = APIRouter(
    prefix="/email-logs",
    tags=["Email Logs"],
)


@router.get("")
def get_email_logs(
    db: Session = Depends(get_db),
):
    logs = db.scalars(
        select(EmailLog)
        .order_by(EmailLog.id.desc())
    ).all()

    result = []
    for log in logs:
        cand = log.candidate
        emp = log.employer
        gm = log.gmail_account

        result.append({
            "id": log.id,
            "candidate_id": log.candidate_id,
            "candidate_name": cand.full_name if cand else f"Candidate #{log.candidate_id}",
            "employer_id": log.employer_id,
            "employer_name": emp.service_name if emp else f"Employer #{log.employer_id}",
            "employer_email": emp.email if emp else None,
            "gmail_account_id": log.gmail_account_id,
            "gmail_email": gm.gmail_email if gm else None,
            "subject": log.subject,
            "status": log.status,
            "gmail_message_id": getattr(log, "gmail_message_id", None),
            "sent_at": log.sent_at.isoformat() if log.sent_at else None,
            "error_message": log.error_message,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return result


@router.get("/{email_log_id}")
def get_email_log(
    email_log_id: int,
    db: Session = Depends(get_db),
):
    email_log = db.get(EmailLog, email_log_id)

    if email_log is None:
        raise HTTPException(
            status_code=404,
            detail="Email log not found",
        )

    return email_log