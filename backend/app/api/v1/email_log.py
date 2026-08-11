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

    return logs


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