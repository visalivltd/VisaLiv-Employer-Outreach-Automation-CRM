from datetime import date, datetime, time, timezone, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.real_candidate import RealCandidate
from app.repositories import real_candidate_repository
from app.services.gmail_service import GmailService


DEFAULT_SUMMARY_SUBJECT = "Application Update"
DEFAULT_SUMMARY_BODY = """Dear {{candidate_name}},

We are pleased to inform you that we have successfully applied to the following employer(s) on your behalf on {{application_date}}:

{{employer_list}}

We will keep you updated on any further developments regarding your application.

Thank you for your trust in VisaLiv.

Kind regards,

VisaLiv Recruitment Team
support@visaliv.com
www.visaliv.com"""


def get_todays_applications_for_real_candidate(
    db: Session,
    real_candidate: RealCandidate,
    target_date: date | None = None,
) -> list[EmailLog]:
    if target_date is None:
        india_tz = timezone(timedelta(hours=5, minutes=30))
        target_date = datetime.now(india_tz).date()

    start_dt = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, time.max, tzinfo=timezone.utc)

    linked_cand_ids = [c.id for c in real_candidate.candidates] if real_candidate.candidates else []
    if not linked_cand_ids:
        return []

    # Query authoritative sent outgoing application logs from target date
    statement = (
        select(EmailLog)
        .where(
            EmailLog.candidate_id.in_(linked_cand_ids),
            EmailLog.direction == "outgoing",
            EmailLog.status == "sent",
            EmailLog.employer_id.isnot(None),
            EmailLog.sent_at >= start_dt,
            EmailLog.sent_at <= end_dt,
            ~EmailLog.subject.startswith("Application Update"),
        )
        .order_by(EmailLog.sent_at.asc())
    )

    return list(db.scalars(statement).all())


def generate_summary_content(
    real_candidate: RealCandidate,
    target_date: date | None = None,
    applications: list[EmailLog] | None = None,
    custom_subject: str | None = None,
    custom_body: str | None = None,
) -> tuple[str, str, list[str]]:
    if target_date is None:
        india_tz = timezone(timedelta(hours=5, minutes=30))
        target_date = datetime.now(india_tz).date()

    formatted_date = target_date.strftime("%d %B %Y")

    # Collect unique employer names applied to today
    seen_employers = set()
    employer_names = []
    if applications:
        for app_log in applications:
            if app_log.employer:
                emp_name = app_log.employer.service_name or app_log.employer.email or "Employer"
            else:
                emp_name = f"Employer #{app_log.employer_id}"

            if emp_name not in seen_employers:
                seen_employers.add(emp_name)
                employer_names.append(emp_name)

    bullet_list = "\n".join([f"• {emp}" for emp in employer_names]) if employer_names else "• None"

    raw_subject = (
        custom_subject
        or real_candidate.summary_template_subject
        or DEFAULT_SUMMARY_SUBJECT
    )

    raw_body = (
        custom_body
        or real_candidate.summary_template_body
        or DEFAULT_SUMMARY_BODY
    )

    replacements = {
        "{{candidate_name}}": real_candidate.name,
        "{{candidate_email}}": real_candidate.email,
        "{{real_candidate_id}}": real_candidate.real_candidate_id,
        "{{application_date}}": formatted_date,
        "{{employer_list}}": bullet_list,
        "{{job_list}}": bullet_list,
        "{{application_count}}": str(len(employer_names)),
    }

    rendered_subject = raw_subject
    rendered_body = raw_body

    for key, val in replacements.items():
        rendered_subject = rendered_subject.replace(key, val)
        rendered_body = rendered_body.replace(key, val)

    return rendered_subject, rendered_body, employer_names


def resolve_summary_gmail_sender(
    db: Session,
    real_candidate: RealCandidate,
) -> GmailAccount:
    """Safe Gmail sender resolution:
    1. Explicit summary_sender_gmail_account_id first.
    2. Automatic fallback ONLY when exactly ONE active Gmail account exists.
    3. Otherwise require explicit selection; do not guess between multiple accounts.
    """
    # Priority 1: Explicit selection
    if real_candidate.summary_sender_gmail_account_id:
        explicit_acc = db.get(GmailAccount, real_candidate.summary_sender_gmail_account_id)
        if explicit_acc and explicit_acc.is_active:
            return explicit_acc

    # Collect active Gmail accounts from linked candidates
    active_accounts = []
    if real_candidate.candidates:
        for c in real_candidate.candidates:
            if c.gmail_account and c.gmail_account.is_active:
                if c.gmail_account not in active_accounts:
                    active_accounts.append(c.gmail_account)

    # Fallback to all active Gmail accounts in CRM if linked candidates have none
    if not active_accounts:
        all_active = db.scalars(select(GmailAccount).where(GmailAccount.is_active.is_(True))).all()
        active_accounts = list(all_active)

    if len(active_accounts) == 1:
        return active_accounts[0]
    elif len(active_accounts) > 1:
        raise ValueError(
            f"Multiple active Gmail accounts exist ({len(active_accounts)} found). "
            f"Please explicitly select a Summary Sender Gmail Account for Real Candidate '{real_candidate.name}'."
        )
    else:
        raise ValueError(
            f"No connected active Gmail account found for sending daily summary to Real Candidate '{real_candidate.name}'."
        )


def is_summary_already_sent_today(
    db: Session,
    real_candidate: RealCandidate,
    target_date: date | None = None,
) -> bool:
    if target_date is None:
        india_tz = timezone(timedelta(hours=5, minutes=30))
        target_date = datetime.now(india_tz).date()

    start_dt = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, time.max, tzinfo=timezone.utc)

    linked_cand_ids = [c.id for c in real_candidate.candidates] if real_candidate.candidates else []

    # Check EmailLog for summary email sent today
    conditions = [
        EmailLog.direction == "outgoing",
        EmailLog.status == "sent",
        EmailLog.sent_at >= start_dt,
        EmailLog.sent_at <= end_dt,
        EmailLog.subject.startswith("Application Update"),
    ]

    if linked_cand_ids:
        conditions.append(EmailLog.candidate_id.in_(linked_cand_ids))

    existing_summary = db.scalar(select(EmailLog).where(and_(*conditions)))
    return existing_summary is not None


def send_daily_summary_for_real_candidate(
    db: Session,
    real_candidate_pk: int,
    target_date: date | None = None,
    force: bool = False,
) -> dict:
    real_cand = real_candidate_repository.get_real_candidate_by_id(db, real_candidate_pk)
    if real_cand is None:
        raise ValueError("Real Candidate not found")

    if not real_cand.email or not real_cand.email.strip():
        return {"success": False, "sent": False, "reason": "Real Candidate has no email address configured"}

    if target_date is None:
        india_tz = timezone(timedelta(hours=5, minutes=30))
        target_date = datetime.now(india_tz).date()

    # 1. Idempotency Check
    if not force and is_summary_already_sent_today(db, real_cand, target_date):
        return {
            "success": True,
            "sent": False,
            "reason": f"Daily summary already sent today ({target_date.strftime('%Y-%m-%d')}) for {real_cand.name}",
        }

    # 2. Get applications sent today
    applications = get_todays_applications_for_real_candidate(db, real_cand, target_date)
    if not applications and not force:
        return {
            "success": True,
            "sent": False,
            "reason": f"No job applications sent today ({target_date.strftime('%Y-%m-%d')}) for {real_cand.name}",
        }

    # 3. Resolve Gmail sender
    sender_account = resolve_summary_gmail_sender(db, real_cand)

    # 4. Generate rendered content
    subject, body, employer_names = generate_summary_content(real_cand, target_date, applications)

    # 5. Send via GmailService
    gmail_service = GmailService(refresh_token=sender_account.refresh_token)
    msg_id = gmail_service.send_email(
        to_email=real_cand.email.strip(),
        subject=subject,
        body=body,
        sender_email=sender_account.gmail_email,
    )

    # 6. Log entry in EmailLog
    cand_id = real_cand.candidates[0].id if real_cand.candidates else 1
    emp_id = applications[0].employer_id if (applications and applications[0].employer_id) else 1

    summary_log = EmailLog(
        candidate_id=cand_id,
        employer_id=emp_id,
        gmail_account_id=sender_account.id,
        subject=subject,
        body=body,
        snippet=body[:150] if body else "",
        status="sent",
        direction="outgoing",
        sent_at=datetime.now(timezone.utc),
        gmail_message_id=msg_id,
    )
    db.add(summary_log)
    db.commit()

    return {
        "success": True,
        "sent": True,
        "recipient": real_cand.email,
        "sender": sender_account.gmail_email,
        "applications_count": len(employer_names),
        "employers": employer_names,
        "gmail_message_id": msg_id,
    }


def send_all_daily_summaries(db: Session, target_date: date | None = None) -> dict:
    real_cands = real_candidate_repository.get_real_candidates(db)
    results = []
    sent_count = 0
    skipped_count = 0

    for real_cand in real_cands:
        try:
            res = send_daily_summary_for_real_candidate(db, real_cand.id, target_date=target_date, force=False)
            if res.get("sent"):
                sent_count += 1
            else:
                skipped_count += 1
            results.append({"real_candidate_id": real_cand.real_candidate_id, "name": real_cand.name, "result": res})
        except Exception as exc:
            skipped_count += 1
            results.append({"real_candidate_id": real_cand.real_candidate_id, "name": real_cand.name, "error": str(exc)})

    return {
        "success": True,
        "total_real_candidates": len(real_cands),
        "sent_count": sent_count,
        "skipped_count": skipped_count,
        "details": results,
    }
