from datetime import datetime, timezone, timedelta

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
    # ==========================================
    # TOTAL CANDIDATES
    # ==========================================

    total_candidates = db.scalar(
        select(func.count(Candidate.id)).where(Candidate.is_active.is_(True))
    ) or 0

    # ==========================================
    # TOTAL EMPLOYERS
    # ==========================================

    total_employers = db.scalar(
        select(func.count(Employer.id)).where(Employer.is_active.is_(True))
    ) or 0

    # ==========================================
    # TOTAL EMAILS SENT
    # ==========================================

    emails_sent = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.status == "sent"
        )
    ) or 0

    # ==========================================
    # TOTAL EMAILS RECEIVED
    # ==========================================

    total_emails_received = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.direction == "incoming"
        )
    ) or 0

    # ==========================================
    # DAILY OUTREACH TARGET
    #
    # 1 candidate = maximum 5 employers/day
    # ==========================================

    daily_target = total_candidates * 5

    # ==========================================
    # EMAILS SENT TODAY
    #
    # Use local India date (UTC+05:30)
    # ==========================================

    india_timezone = timezone(
        timedelta(hours=5, minutes=30)
    )

    now_india = datetime.now(india_timezone)

    start_of_today = now_india.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    end_of_today = start_of_today + timedelta(days=1)

    emails_sent_today = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.status == "sent",
            EmailLog.sent_at >= start_of_today,
            EmailLog.sent_at < end_of_today,
        )
    ) or 0

    # ==========================================
    # REMAINING DAILY OUTREACH
    # ==========================================

    remaining_today = max(
        daily_target - emails_sent_today,
        0,
    )

    # ==========================================
    # RECENT EMAIL ACTIVITY
    # ==========================================

    recent_logs = db.scalars(
        select(EmailLog)
        .where(
            EmailLog.status == "sent"
        )
        .order_by(
            EmailLog.sent_at.desc()
        )
        .limit(5)
    ).all()

    recent_emails = []

    for log in recent_logs:
        candidate = db.get(
            Candidate,
            log.candidate_id,
        )

        employer = db.get(
            Employer,
            log.employer_id,
        )

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
                    if candidate
                    and candidate.full_name
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

    # ==========================================
    # DASHBOARD RESPONSE
    # ==========================================

    return {
        "totalCandidates": total_candidates,
        "totalEmployers": total_employers,
        "emailsSent": emails_sent,
        "totalEmailsReceived": total_emails_received,
        "total_emails_received": total_emails_received,
        "emailsSentToday": emails_sent_today,
        "recentEmails": recent_emails,
    }