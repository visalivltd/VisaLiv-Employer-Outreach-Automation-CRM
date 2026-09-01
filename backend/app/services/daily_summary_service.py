from datetime import date, datetime, time, timezone, timedelta
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.real_candidate import RealCandidate
from app.models.system_gmail_account import SystemGmailAccount
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

VISALIV_SUMMARY_HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #1e3a8a; padding: 32px 32px 28px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                VisaLiv
              </h1>
              <p style="color: #93c5fd; margin: 6px 0 0 0; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                Your Global Career &amp; Immigration Partner
              </p>
            </td>
          </tr>

          <!-- Main Email Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              
              <!-- Section Title -->
              <h2 style="color: #0f172a; margin: 0 0 20px 0; font-size: 20px; font-weight: 700; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; display: inline-block;">
                Application Update
              </h2>

              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                Dear <strong>{{candidate_name}}</strong>,
              </p>

              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                We are pleased to inform you that we have successfully applied to the following employer(s) on your behalf on <strong>{{application_date}}</strong>:
              </p>

              <!-- Dynamic Employer Cards -->
              {{employer_cards}}

              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 28px 0 16px 0;">
                We will keep you updated on any further developments regarding your application.
              </p>

              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                Thank you for your trust in VisaLiv.
              </p>

              <!-- Sign-off Signature -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="color: #475569; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">
                  Kind regards,
                </p>
                <p style="color: #1e293b; font-size: 15px; margin: 0 0 6px 0; font-weight: 700;">
                  VisaLiv Recruitment Team
                </p>
                <p style="color: #2563eb; font-size: 13px; margin: 0;">
                  <a href="mailto:support@visaliv.com" style="color: #2563eb; text-decoration: none;">support@visaliv.com</a> &nbsp;|&nbsp; 
                  <a href="https://www.visaliv.com" style="color: #2563eb; text-decoration: none;">www.visaliv.com</a>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This is an automated application update from VisaLiv.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _render_employer_cards(employer_names: list[str]) -> str:
    if not employer_names:
        return """
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
          <tr>
            <td style="background-color: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #94a3b8; border-radius: 8px; padding: 14px 18px;">
              <span style="font-size: 14px; color: #64748b; font-style: italic;">
                None
              </span>
            </td>
          </tr>
        </table>
        """
    cards = []
    for emp in employer_names:
        cards.append(f"""
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
          <tr>
            <td style="background-color: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: 8px; padding: 14px 18px;">
              <span style="font-size: 15px; font-weight: 700; color: #0f172a;">
                {emp}
              </span>
            </td>
          </tr>
        </table>
        """)
    return "".join(cards)


def get_todays_applications_for_real_candidate(
    db: Session,
    real_candidate: RealCandidate,
    target_date: date | None = None,
) -> list[EmailLog]:
    india_tz = timezone(timedelta(hours=5, minutes=30))
    if target_date is None:
        target_date = datetime.now(india_tz).date()

    start_dt_ist = datetime.combine(target_date, time.min, tzinfo=india_tz)
    start_dt = start_dt_ist.astimezone(timezone.utc)
    end_dt_ist = datetime.combine(target_date, time.max, tzinfo=india_tz)
    end_dt = end_dt_ist.astimezone(timezone.utc)

    linked_cand_ids = [c.id for c in real_candidate.candidates] if real_candidate.candidates else []
    if not linked_cand_ids:
        return []

    # Query authoritative sent outgoing application logs from target date IST
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
    employer_cards_html = _render_employer_cards(employer_names)

    raw_subject = (
        custom_subject
        or real_candidate.summary_template_subject
        or DEFAULT_SUMMARY_SUBJECT
    )

    raw_body = (
        custom_body
        or real_candidate.summary_template_body
    )

    rendered_subject = raw_subject.replace("{{candidate_name}}", real_candidate.name).replace("{{application_date}}", formatted_date)

    if raw_body and ("<html" in raw_body.lower() or "<!doctype" in raw_body.lower()):
        rendered_body = raw_body
        replacements = {
            "{{candidate_name}}": real_candidate.name,
            "{{candidate_email}}": real_candidate.email,
            "{{real_candidate_id}}": real_candidate.real_candidate_id,
            "{{application_date}}": formatted_date,
            "{{employer_list}}": bullet_list,
            "{{employer_cards}}": employer_cards_html,
            "{{job_list}}": bullet_list,
            "{{application_count}}": str(len(employer_names)),
        }
        for key, val in replacements.items():
            rendered_body = rendered_body.replace(key, val)
    else:
        # Use canonical VisaLiv HTML email template as the single source of truth
        rendered_body = VISALIV_SUMMARY_HTML_TEMPLATE
        replacements = {
            "{{candidate_name}}": real_candidate.name,
            "{{candidate_email}}": real_candidate.email,
            "{{real_candidate_id}}": real_candidate.real_candidate_id,
            "{{application_date}}": formatted_date,
            "{{employer_cards}}": employer_cards_html,
            "{{application_count}}": str(len(employer_names)),
        }
        for key, val in replacements.items():
            rendered_body = rendered_body.replace(key, val)

    return rendered_subject, rendered_body, employer_names


def resolve_summary_gmail_sender(
    db: Session,
    real_candidate: RealCandidate | None = None,
) -> SystemGmailAccount:
    """Finds the designated System/Support Gmail account (support@visaliv.com) for sending daily summaries.
    Queries SystemGmailAccount where is_active == True.
    If support@visaliv.com is missing or inactive, raises a clear backend error.
    """
    system_acc = db.scalars(
        select(SystemGmailAccount).where(
            func.lower(SystemGmailAccount.gmail_email) == "support@visaliv.com",
            SystemGmailAccount.is_active.is_(True)
        )
    ).first()

    if not system_acc:
        # Fallback to any active SystemGmailAccount if email varies slightly
        system_acc = db.scalars(
            select(SystemGmailAccount).where(
                SystemGmailAccount.is_active.is_(True)
            )
        ).first()

    if not system_acc:
        cand_name_str = f" for Real Candidate '{real_candidate.name}'" if real_candidate and real_candidate.name else ""
        raise ValueError(
            f"System/Support Gmail account (support@visaliv.com) is not connected or not active{cand_name_str}. "
            f"Please connect the System/Support Gmail account to send daily summaries."
        )

    return system_acc


def is_summary_already_sent_today(
    db: Session,
    real_candidate: RealCandidate,
    target_date: date | None = None,
) -> bool:
    india_tz = timezone(timedelta(hours=5, minutes=30))
    if target_date is None:
        target_date = datetime.now(india_tz).date()

    start_dt_ist = datetime.combine(target_date, time.min, tzinfo=india_tz)
    start_dt = start_dt_ist.astimezone(timezone.utc)
    end_dt_ist = datetime.combine(target_date, time.max, tzinfo=india_tz)
    end_dt = end_dt_ist.astimezone(timezone.utc)

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

    india_tz = timezone(timedelta(hours=5, minutes=30))
    if target_date is None:
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

    # 3. Resolve Gmail sender (support@visaliv.com)
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
        is_html=True,
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


def send_all_daily_summaries(
    db: Session,
    target_date: date | None = None,
    real_candidate_ids: list[int] | None = None,
    force: bool = False,
) -> dict:
    all_cands = real_candidate_repository.get_real_candidates(db)
    if real_candidate_ids:
        target_ids = set(real_candidate_ids)
        real_cands = [rc for rc in all_cands if rc.id in target_ids]
    else:
        real_cands = all_cands

    results = []
    sent_count = 0
    skipped_count = 0

    for real_cand in real_cands:
        try:
            res = send_daily_summary_for_real_candidate(db, real_cand.id, target_date=target_date, force=force)
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
