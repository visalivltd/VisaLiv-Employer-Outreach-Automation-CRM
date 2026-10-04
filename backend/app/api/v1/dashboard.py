from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.email_log import EmailLog
from app.models.gmail_account import GmailAccount


from app.models.outreach_job import OutreachJob


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("")
def get_dashboard(
    target_date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
):
    # ==========================================
    # TOTAL CANDIDATES
    # ==========================================

    total_candidates = db.scalar(
        select(func.count(Candidate.id))
    ) or 0

    # ==========================================
    # TOTAL EMPLOYERS
    # ==========================================

    total_employers = db.scalar(
        select(func.count(Employer.id)).where(Employer.is_active.is_(True))
    ) or 0

    employers_with_email = db.scalar(
        select(func.count(Employer.id)).where(Employer.is_active.is_(True), Employer.email.isnot(None), Employer.email != "")
    ) or 0

    employers_without_email = db.scalar(
        select(func.count(Employer.id)).where(Employer.is_active.is_(True), (Employer.email.is_(None) | (Employer.email == "")))
    ) or 0

    imported_employers = db.scalar(
        select(func.count(Employer.id)).where(Employer.is_active.is_(True), Employer.import_order.isnot(None))
    ) or 0

    # ==========================================
    # TOTAL EMAILS SENT (ALL TIME)
    # ==========================================

    emails_sent = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.status == "sent"
        )
    ) or 0

    # ==========================================
    # TOTAL EMAILS FAILED (ALL TIME)
    # ==========================================

    emails_failed = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.status.in_(["failed", "bounced", "error"])
        )
    ) or 0

    # ==========================================
    # TOTAL EMAILS RECEIVED (ALL TIME)
    # ==========================================

    total_emails_received = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.direction == "incoming"
        )
    ) or 0

    # ==========================================
    # DAILY OUTREACH TARGET
    # ==========================================

    daily_target = total_candidates * 5

    # ==========================================
    # DATE RANGE FILTERING (India timezone UTC+05:30)
    # ==========================================

    india_timezone = timezone(timedelta(hours=5, minutes=30))
    now_india = datetime.now(india_timezone)
    start_of_today = now_india.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_today = start_of_today + timedelta(days=1)

    eff_start = start_date or target_date
    eff_end = end_date or target_date

    is_filtered = False
    if eff_start or eff_end:
        is_filtered = True
        try:
            if eff_start:
                p_start = datetime.strptime(eff_start, "%Y-%m-%d")
                selected_start = datetime(p_start.year, p_start.month, p_start.day, 0, 0, 0, tzinfo=india_timezone)
            else:
                selected_start = datetime(2000, 1, 1, 0, 0, 0, tzinfo=india_timezone)
            
            if eff_end:
                p_end = datetime.strptime(eff_end, "%Y-%m-%d")
                selected_end = datetime(p_end.year, p_end.month, p_end.day, 23, 59, 59, 999999, tzinfo=india_timezone)
            else:
                selected_end = datetime(2099, 12, 31, 23, 59, 59, 999999, tzinfo=india_timezone)
        except ValueError:
            is_filtered = False
            selected_start = start_of_today
            selected_end = end_of_today
    else:
        selected_start = start_of_today
        selected_end = end_of_today

    # Emails sent today
    emails_sent_today = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.status == "sent",
            EmailLog.sent_at >= start_of_today,
            EmailLog.sent_at < end_of_today,
        )
    ) or 0

    if is_filtered:
        emails_sent_on_date = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.status == "sent",
                EmailLog.sent_at >= selected_start,
                EmailLog.sent_at <= selected_end,
            )
        ) or 0

        emails_received_on_date = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.direction == "incoming",
                EmailLog.sent_at >= selected_start,
                EmailLog.sent_at <= selected_end,
            )
        ) or 0

        emails_failed_on_date = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.status.in_(["failed", "bounced", "error"]),
                EmailLog.sent_at >= selected_start,
                EmailLog.sent_at <= selected_end,
            )
        ) or 0
    else:
        emails_sent_on_date = emails_sent
        emails_received_on_date = total_emails_received
        emails_failed_on_date = emails_failed

    # Pending outreach jobs count
    pending_emails = db.scalar(
        select(func.count(OutreachJob.id)).where(
            OutreachJob.status.in_(["queued", "pending", "processing"])
        )
    ) or 0

    # Calculate success rate
    eff_sent_calc = emails_sent_on_date if is_filtered else emails_sent
    eff_failed_calc = emails_failed_on_date if is_filtered else emails_failed
    total_outreach = eff_sent_calc + eff_failed_calc

    if total_outreach > 0:
        success_rate = round((eff_sent_calc / total_outreach) * 100, 1)
    else:
        success_rate = 100.0

    # Growth & Comparison Trends
    start_of_month = now_india.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    candidates_this_month = db.scalar(
        select(func.count(Candidate.id)).where(Candidate.created_at >= start_of_month)
    ) or 0

    employers_this_month = db.scalar(
        select(func.count(Employer.id)).where(Employer.created_at >= start_of_month)
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
        "isFiltered": is_filtered,
        "totalCandidates": total_candidates,
        "totalEmployers": total_employers,
        "employersWithEmail": employers_with_email,
        "employersWithoutEmail": employers_without_email,
        "importedEmployers": imported_employers,
        "emailsSent": emails_sent,
        "totalEmailsReceived": total_emails_received,
        "total_emails_received": total_emails_received,
        "emailsSentToday": emails_sent_today,
        "selectedDate": eff_start or "",
        "emailsSentOnDate": emails_sent_on_date,
        "emailsReceivedOnDate": emails_received_on_date,
        "emailsFailed": emails_failed,
        "emailsFailedOnDate": emails_failed_on_date,
        "pendingEmails": pending_emails,
        "successRate": success_rate,
        "candidatesThisMonth": candidates_this_month,
        "employersThisMonth": employers_this_month,
        "recentEmails": recent_emails,
    }