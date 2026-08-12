from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.email_log import EmailLog
from app.models.gmail_account import GmailAccount


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
):
    total_candidates = db.scalar(
        select(func.count(Candidate.id))
    ) or 0

    total_employers = db.scalar(
        select(func.count(Employer.id))
    ) or 0

    emails_sent = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.status == "sent"
        )
    ) or 0

    recent_logs = db.scalars(
        select(EmailLog)
        .where(EmailLog.status == "sent")
        .order_by(EmailLog.sent_at.desc())
        .limit(5)
    ).all()

    recent_emails = []

    for log in recent_logs:
        candidate = db.get(Candidate, log.candidate_id)
        employer = db.get(Employer, log.employer_id)
        gmail_account = db.get(
            GmailAccount,
            log.gmail_account_id,
        )

        recent_emails.append(
            {
                "id": log.id,
                "studentName": (
                    candidate.full_name
                    if candidate
                    else f"Candidate #{log.candidate_id}"
                ),
                "studentInitial": (
                    candidate.full_name[0].upper()
                    if candidate and candidate.full_name
                    else "?"
                ),
                "employer": (
                    employer.service_name
                    if employer
                    else f"Employer #{log.employer_id}"
                ),
                "gmailAccountEmail": (
                    gmail_account.gmail_email
                    if gmail_account
                    else "-"
                ),
                "subject": log.subject,
                "status": log.status,
                "sentAt": log.sent_at,
            }
        )

    return {
        "totalCandidates": total_candidates,
        "totalEmployers": total_employers,
        "emailsSent": emails_sent,
        "recentEmails": recent_emails,
    }