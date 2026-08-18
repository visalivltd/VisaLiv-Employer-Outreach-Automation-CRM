import re
import logging
import threading
from datetime import datetime, timezone
from email.utils import parseaddr, parsedate_to_datetime
from pathlib import Path

from googleapiclient.discovery import build
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.notification import Notification
from app.services.gmail_service import GmailService, GMAIL_READONLY_SCOPE

logger = logging.getLogger(__name__)
_sync_lock = threading.Lock()


import base64


def extract_email_address(header_value: str | None) -> str:
    if not header_value:
        return ""
    _, email_addr = parseaddr(header_value)
    return email_addr.strip().lower()


def extract_body_from_gmail_payload(payload: dict) -> str:
    """Recursively extracts plain text (or html fallback) body from Gmail API payload."""
    if not payload:
        return ""

    body_text = ""

    def _parse_parts(parts):
        nonlocal body_text
        for part in parts:
            mime_type = part.get("mimeType", "")
            data = part.get("body", {}).get("data")
            if mime_type == "text/plain" and data:
                try:
                    body_text = base64.urlsafe_b64decode(data.encode("ASCII")).decode("utf-8", errors="replace")
                    return True
                except Exception:
                    pass
            elif part.get("parts"):
                if _parse_parts(part.get("parts")):
                    return True
        return False

    data = payload.get("body", {}).get("data")
    mime_type = payload.get("mimeType", "")
    if mime_type == "text/plain" and data:
        try:
            return base64.urlsafe_b64decode(data.encode("ASCII")).decode("utf-8", errors="replace")
        except Exception:
            pass

    if payload.get("parts"):
        _parse_parts(payload.get("parts"))

    if not body_text and payload.get("parts"):
        for part in payload.get("parts"):
            data = part.get("body", {}).get("data")
            if data:
                try:
                    return base64.urlsafe_b64decode(data.encode("ASCII")).decode("utf-8", errors="replace")
                except Exception:
                    pass

    return body_text


def sync_incoming_replies(db: Session) -> dict:
    """
    Synchronizes all Gmail messages across connected candidate accounts.
    Inspects Gmail messages and threads.
    Strictly deduplicates using gmail_message_id.
    Creates incoming EmailLogs & Notifications for new incoming emails.
    """
    if not _sync_lock.acquire(blocking=False):
        print("[EMAIL SYNC] Sync already in progress", flush=True)
        return {
            "success": True,
            "message": "Sync already in progress",
            "accounts_checked": 0,
            "threads_checked": 0,
            "messages_scanned": 0,
            "new_messages": 0,
            "incoming_messages": 0,
            "outgoing_messages": 0,
            "duplicates_skipped": 0,
            "email_logs_created": 0,
            "notifications_created": 0,
            "account_errors": [],
        }

    accounts_checked = 0
    threads_checked = 0
    messages_scanned = 0
    new_messages = 0
    incoming_messages = 0
    outgoing_messages = 0
    duplicates_skipped = 0
    email_logs_created = 0
    notifications_created = 0
    account_errors = []

    try:
        active_accounts = db.scalars(
            select(GmailAccount).where(GmailAccount.is_active.is_(True))
        ).all()

        for account in active_accounts:
            candidate = account.candidate or db.get(Candidate, account.candidate_id)
            if not candidate or not account.refresh_token:
                continue

            cand_name = candidate.full_name
            cand_gmail = (account.gmail_email or "").strip().lower()
            accounts_checked += 1

            print(f"[EMAIL SYNC] Account #{account.id}: {cand_gmail} (Candidate: {cand_name})", flush=True)

            try:
                # Obtain credentials without forcing restrictive scope strings
                gmail_service = GmailService(refresh_token=account.refresh_token)
                try:
                    creds = gmail_service._get_credentials(scopes=None)
                except Exception as exc:
                    err_msg = str(exc)
                    print(f"[EMAIL SYNC REAUTH] Account {cand_gmail} credentials failed: {err_msg}", flush=True)
                    account_errors.append({
                        "gmail_email": cand_gmail,
                        "candidate_id": account.candidate_id,
                        "candidate_name": cand_name,
                        "status": "REAUTH_REQUIRED",
                        "error": "CREDENTIALS_FAILED",
                        "message": f"Gmail credentials error for {cand_name} ({cand_gmail}). Reauthorization required.",
                    })
                    continue

                gmail = build("gmail", "v1", credentials=creds)

                # Fetch messages directly from Gmail API
                messages_list = []
                try:
                    msg_res = (
                        gmail.users()
                        .messages()
                        .list(userId="me", maxResults=50)
                        .execute()
                    )
                    messages_list = msg_res.get("messages", [])
                except Exception as list_exc:
                    err_msg = str(list_exc)
                    print(f"[EMAIL SYNC REAUTH] Account {cand_gmail} list messages failed: {err_msg}", flush=True)
                    account_errors.append({
                        "gmail_email": cand_gmail,
                        "candidate_id": account.candidate_id,
                        "candidate_name": cand_name,
                        "status": "REAUTH_REQUIRED",
                        "error": "GMAIL_READ_SCOPE_MISSING",
                        "message": f"Gmail read permission missing for {cand_name} ({cand_gmail}). Reauthorization required.",
                    })
                    continue

                if not messages_list:
                    try:
                        threads_res = (
                            gmail.users()
                            .threads()
                            .list(userId="me", maxResults=50)
                            .execute()
                        )
                        t_list = threads_res.get("threads", [])
                        for t in t_list:
                            t_id = t.get("id")
                            if not t_id:
                                continue
                            try:
                                t_detail = (
                                    gmail.users()
                                    .threads()
                                    .get(userId="me", id=t_id, format="full")
                                    .execute()
                                )
                                t_msgs = t_detail.get("messages", [])
                                if not t_msgs:
                                    t_msgs = [t_detail]
                                for msg in t_msgs:
                                    messages_list.append(msg)
                            except Exception:
                                pass
                    except Exception:
                        pass

                print(f"[EMAIL SYNC] Gmail messages list count: {len(messages_list)} for account {cand_gmail}", flush=True)

                if not messages_list:
                    continue

                cand_emails = {
                    cand_gmail,
                    (candidate.email or "").strip().lower(),
                }

                all_employers = db.scalars(
                    select(Employer).where(Employer.is_active.is_(True))
                ).all()
                employer_by_email = {
                    (emp.email or "").strip().lower(): emp
                    for emp in all_employers
                    if emp.email
                }

                for m in messages_list:
                    msg_id = m.get("id")
                    if not msg_id:
                        continue

                    messages_scanned += 1

                    try:
                        # STRICT MESSAGE-LEVEL DEDUPLICATION BY GMAIL MESSAGE ID
                        existing_log = db.scalar(
                            select(EmailLog).where(EmailLog.gmail_message_id == msg_id)
                        )
                        if existing_log:
                            duplicates_skipped += 1
                            continue

                        if "payload" in m or "snippet" in m:
                            m_detail = m
                        else:
                            try:
                                m_detail = (
                                    gmail.users()
                                    .messages()
                                    .get(userId="me", id=msg_id, format="full")
                                    .execute()
                                )
                            except Exception as get_exc:
                                print(f"[EMAIL SYNC ERROR] Failed to fetch message {msg_id}: {get_exc}", flush=True)
                                continue

                        msg_thread_id = m_detail.get("threadId") or msg_id
                        headers = m_detail.get("payload", {}).get("headers", [])
                        header_dict = {
                            h["name"].lower(): h["value"]
                            for h in headers
                            if "name" in h and "value" in h
                        }

                        from_hdr = header_dict.get("from", "")
                        to_hdr = header_dict.get("to", "")
                        sender_email = extract_email_address(from_hdr)
                        recipient_email = extract_email_address(to_hdr)
                        subject = header_dict.get("subject", "No Subject")
                        snippet = m_detail.get("snippet", "")
                        date_hdr = header_dict.get("date")

                        received_at = datetime.now(timezone.utc)
                        if date_hdr:
                            try:
                                received_at = parsedate_to_datetime(date_hdr)
                            except Exception:
                                pass

                        body_text = extract_body_from_gmail_payload(m_detail.get("payload")) or snippet

                        # System / Security / Bounce sender detection
                        system_senders = {
                            "no-reply@accounts.google.com",
                            "mailer-daemon@googlemail.com",
                            "google-noreply@google.com",
                        }
                        is_system_sender = (
                            sender_email in system_senders
                            or sender_email.startswith("no-reply@")
                            or sender_email.startswith("noreply@")
                            or sender_email.startswith("postmaster@")
                            or "mailer-daemon" in sender_email
                        )

                        print(f"[INCOMING EMAIL FOUND] gmail_email: {cand_gmail} | from: {sender_email} | to: {recipient_email} | subject: {subject} | thread_id: {msg_thread_id}", flush=True)

                        # Determine Direction
                        is_candidate_sender = sender_email in cand_emails
                        direction = "outgoing" if is_candidate_sender else "incoming"

                        target_email = recipient_email if is_candidate_sender else sender_email

                        # Employer Mapping (Priority Rules):
                        matched_employer = None
                        matched_by = "none"

                        # Priority 1: Match thread_id or msg_thread_id or In-Reply-To / References against existing EmailLogs for this candidate
                        in_reply_to = header_dict.get("in-reply-to", "")
                        references = header_dict.get("references", "")
                        reply_ref = (in_reply_to + " " + references).strip()

                        cand_logs = db.scalars(
                            select(EmailLog)
                            .where(EmailLog.candidate_id == candidate.id)
                            .order_by(EmailLog.id.desc())
                        ).all()

                        for log in cand_logs:
                            if log.gmail_message_id:
                                if (
                                    log.gmail_message_id == msg_thread_id
                                    or (log.gmail_thread_id and log.gmail_thread_id == msg_thread_id)
                                    or (reply_ref and log.gmail_message_id in reply_ref)
                                ):
                                    matched_employer = log.employer or (db.get(Employer, log.employer_id) if log.employer_id else None)
                                    if matched_employer:
                                        matched_by = "thread_id_or_headers"
                                        break

                        # Priority 2: Direct match target_email against Employer table
                        if not matched_employer and target_email and not is_system_sender:
                            matched_employer = employer_by_email.get(target_email)
                            if not matched_employer:
                                matched_employer = db.scalar(
                                    select(Employer).where(Employer.email.ilike(target_email))
                                )
                            if matched_employer:
                                matched_by = "employer_email_lookup"

                        # Priority 3: Auto-create Employer record for real senders if missing
                        if not matched_employer and target_email and target_email != cand_gmail and not is_system_sender:
                            emp_name = target_email.split("@")[0].replace(".", " ").title()
                            try:
                                matched_employer = Employer(
                                    service_name=emp_name,
                                    email=target_email,
                                    is_active=True,
                                )
                                db.add(matched_employer)
                                db.commit()
                                db.refresh(matched_employer)
                                employer_by_email[target_email] = matched_employer
                                matched_by = "auto_created_employer"
                                print(f"[EMAIL SYNC] Auto-created Employer: {emp_name} ({target_email})", flush=True)
                            except Exception as create_emp_exc:
                                db.rollback()
                                print(f"[EMAIL SYNC WARNING] Failed to auto-create employer for {target_email}: {create_emp_exc}", flush=True)
                                matched_employer = None

                        # Validate matched_employer existence in database
                        if matched_employer and matched_employer.id:
                            emp_in_db = db.get(Employer, matched_employer.id)
                            if not emp_in_db:
                                matched_employer = None

                        if not matched_employer or not matched_employer.id:
                            print(f"[EMAIL SYNC SKIPPED] No valid employer matched for email subject '{subject}' from '{sender_email}' (target: '{target_email}'). Skipping EmailLog creation.", flush=True)
                            continue

                        if direction == "outgoing":
                            outgoing_messages += 1
                            new_messages += 1
                            out_log = EmailLog(
                                candidate_id=candidate.id,
                                employer_id=matched_employer.id,
                                gmail_account_id=account.id,
                                subject=subject,
                                status="sent",
                                direction="outgoing",
                                sent_at=received_at,
                                gmail_message_id=msg_id,
                                gmail_thread_id=msg_thread_id,
                                body=body_text,
                                snippet=snippet,
                                error_message=None,
                            )
                            db.add(out_log)
                            db.commit()
                            email_logs_created += 1
                            print(f"[INCOMING EMAIL CREATED] email_log_id: #{out_log.id} | thread_id: {msg_thread_id} | direction: outgoing", flush=True)

                        else:
                            incoming_messages += 1
                            new_messages += 1
                            incoming_log = EmailLog(
                                candidate_id=candidate.id,
                                employer_id=matched_employer.id,
                                gmail_account_id=account.id,
                                subject=subject,
                                status="received",
                                direction="incoming",
                                sent_at=received_at,
                                gmail_message_id=msg_id,
                                gmail_thread_id=msg_thread_id,
                                body=body_text,
                                snippet=snippet,
                                error_message=None,
                            )
                            db.add(incoming_log)
                            db.commit()
                            db.refresh(incoming_log)
                            email_logs_created += 1

                            print(f"[INCOMING EMAIL MATCH] candidate_id: {candidate.id} | employer_id: {matched_employer.id} | matched_by: {matched_by}", flush=True)
                            print(f"[INCOMING EMAIL CREATED] email_log_id: #{incoming_log.id} | thread_id: {msg_thread_id}", flush=True)

                            # CREATE CRM UNREAD NOTIFICATION FOR REAL EMPLOYER REPLIES (Excluding system notices)
                            if not is_system_sender and matched_employer:
                                existing_notif = db.scalar(
                                    select(Notification).where(Notification.gmail_message_id == msg_id)
                                )
                                if not existing_notif:
                                    employer_name = matched_employer.service_name or matched_employer.email
                                    notif = Notification(
                                        type="employer_reply",
                                        title="New Email Received",
                                        message=f"New email from {employer_name} regarding \"{subject}\"",
                                        candidate_id=candidate.id,
                                        employer_id=matched_employer.id,
                                        email_log_id=incoming_log.id,
                                        gmail_message_id=msg_id,
                                        is_read=False,
                                    )
                                    db.add(notif)
                                    db.commit()
                                    notifications_created += 1
                                    print(f"[NOTIFICATION CREATED] notification_id: #{notif.id}", flush=True)
                            elif is_system_sender:
                                print(f"[INCOMING SYSTEM NOTICE] System/bounce message from {sender_email} logged without employer reply notification.", flush=True)
                    except Exception as msg_exc:
                        db.rollback()
                        print(f"[EMAIL SYNC ERROR] Message {msg_id} failed during sync: {msg_exc}", flush=True)

            except Exception as exc:
                err_str = str(exc)
                print(f"[EMAIL SYNC] Account error on {cand_gmail}: {err_str}", flush=True)
                account_errors.append({
                    "gmail_email": cand_gmail,
                    "candidate_id": account.candidate_id,
                    "error": err_str,
                })
                db.rollback()

    finally:
        _sync_lock.release()

    accounts_synced = accounts_checked - len(account_errors)
    overall_success = (accounts_synced > 0) or (accounts_checked == 0)

    sync_msg = "Sync completed successfully"
    if not overall_success and accounts_checked > 0:
        sync_msg = "Sync failed for all candidate accounts because Gmail read permission is missing. Please reauthorize candidate accounts."
    elif len(account_errors) > 0:
        sync_msg = f"Synced {accounts_synced} of {accounts_checked} accounts. {len(account_errors)} account(s) require reauthorization."

    res_dict = {
        "success": overall_success,
        "message": sync_msg,
        "accounts_checked": accounts_checked,
        "accounts_synced": accounts_synced,
        "threads_checked": threads_checked,
        "messages_scanned": messages_scanned,
        "new_messages": new_messages,
        "incoming_messages": incoming_messages,
        "outgoing_messages": outgoing_messages,
        "duplicates_skipped": duplicates_skipped,
        "email_logs_created": email_logs_created,
        "notifications_created": notifications_created,
        "new_notifications": notifications_created,
        "new_replies_found": incoming_messages,
        "account_errors": account_errors,
    }

    print("[EMAIL SYNC RESULT]")
    for k, v in res_dict.items():
        print(f"  {k}: {v}", flush=True)

    return res_dict
