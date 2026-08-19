import base64
import mimetypes
from email.message import EmailMessage
from pathlib import Path

from fastapi import HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import settings

GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
PROJECT_ROOT = Path(__file__).resolve().parents[2]


import html
import re

def _is_html_content(text: str | None) -> bool:
    if not text:
        return False
    s = text.strip().lower()
    return any(tag in s for tag in ("<html", "<table", "<div", "<p>", "<p ", "<body", "<!doctype html"))

def _strip_html(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r'<style.*?>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'<script.*?>.*?</script>', '', clean, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'<br\s*/?>', '\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'</p>', '\n\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'</div>', '\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'<tr.*?>', '\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'<td.*?>', '  ', clean, flags=re.IGNORECASE)
    clean = re.sub(r'<.*?>', '', clean)
    clean = html.unescape(clean)
    lines = [line.strip() for line in clean.splitlines()]
    return '\n'.join([line for line in lines if line])


class GmailService:
    def __init__(
        self,
        refresh_token: str,
    ):
        self.refresh_token = refresh_token

    def _get_credentials(self, scopes: list[str] | None = None) -> Credentials:
        target_scopes = scopes
        try:
            credentials = Credentials(
                token=None,
                refresh_token=self.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                scopes=target_scopes,
            )
            credentials.refresh(Request())
            return credentials
        except Exception as exc:
            # Fallback: Refresh token using default granted scopes without forcing explicit scopes
            if target_scopes is not None:
                try:
                    fallback_credentials = Credentials(
                        token=None,
                        refresh_token=self.refresh_token,
                        token_uri="https://oauth2.googleapis.com/token",
                        client_id=settings.GOOGLE_CLIENT_ID,
                        client_secret=settings.GOOGLE_CLIENT_SECRET,
                        scopes=None,
                    )
                    fallback_credentials.refresh(Request())
                    return fallback_credentials
                except Exception:
                    pass

            raise HTTPException(
                status_code=400,
                detail=f"Google Gmail authentication failed: {exc}",
            ) from exc

    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        sender_email: str | None = None,
        attachment_paths: list[str] | None = None,
        thread_id: str | None = None,
        is_html: bool = False,
        html_body: str | None = None,
    ) -> str:
        credentials = self._get_credentials()

        gmail = build(
            "gmail",
            "v1",
            credentials=credentials,
        )

        to_email_clean = (to_email or "").strip()

        message = EmailMessage()
        if sender_email and sender_email.strip():
            message["From"] = sender_email.strip()
        message["To"] = to_email_clean
        message["Subject"] = subject
        if thread_id:
            clean_thread = thread_id.strip("<>")
            message["In-Reply-To"] = f"<{clean_thread}>"
            message["References"] = f"<{clean_thread}>"

        target_html = html_body if html_body else (body if (is_html or _is_html_content(body)) else None)

        if target_html:
            plain_fallback = _strip_html(target_html)
            message.set_content(plain_fallback)
            message.add_alternative(target_html, subtype="html")
        else:
            message.set_content(body)

        for item in (attachment_paths or []):
            if not item:
                continue

            if isinstance(item, (tuple, list)):
                path_str, display_name = item[0], item[1]
            else:
                path_str, display_name = item, None

            file_path = Path(path_str)
            if not file_path.is_absolute():
                candidate_backend = PROJECT_ROOT / path_str
                candidate_workspace = PROJECT_ROOT.parent / path_str
                if candidate_backend.exists():
                    file_path = candidate_backend
                elif candidate_workspace.exists():
                    file_path = candidate_workspace
                else:
                    file_path = candidate_backend

            if not file_path.exists() or not file_path.is_file():
                raise FileNotFoundError(f"Attachment file not found: {path_str}")

            content_type, _ = mimetypes.guess_type(str(file_path))
            if content_type is None:
                content_type = "application/octet-stream"
            main_type, sub_type = content_type.split("/", 1)
            file_data = file_path.read_bytes()
            message.add_attachment(
                file_data,
                maintype=main_type,
                subtype=sub_type,
                filename=display_name or file_path.name,
            )

        encoded_message = base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode()

        print("=" * 60, flush=True)
        print("GMAIL API SENDING MESSAGE:", flush=True)
        print(f"  From: {sender_email or 'me'}", flush=True)
        print(f"  To: {to_email_clean}", flush=True)
        print(f"  Subject: {subject}", flush=True)
        print(f"  Thread ID: {thread_id or 'None'}", flush=True)
        print(f"  Attachment Count: {len(attachment_paths or [])}", flush=True)

        payload = {"raw": encoded_message}
        if thread_id and thread_id.strip():
            clean_thread = thread_id.strip("<>")
            payload["threadId"] = clean_thread

        print("=" * 60, flush=True)
        print("[REPLY DEBUG] GMAIL API SENDING MESSAGE:", flush=True)
        print(f"  From: {sender_email or 'me'}", flush=True)
        print(f"  To: {to_email_clean}", flush=True)
        print(f"  Subject: {subject}", flush=True)
        print(f"  Thread ID: {thread_id or 'None'}", flush=True)
        print(f"  Attachment Count: {len(attachment_paths or [])}", flush=True)

        try:
            result = (
                gmail.users()
                .messages()
                .send(
                    userId="me",
                    body=payload,
                )
                .execute()
            )
            msg_id = result.get("id")
            ret_thread_id = result.get("threadId")

            print("[REPLY DEBUG] GMAIL API SEND CONFIRMED:", flush=True)
            print(f"  Gmail Message ID: {msg_id}", flush=True)
            print(f"  Thread ID: {ret_thread_id}", flush=True)
            print("=" * 60, flush=True)

            return msg_id
        except Exception as exc:
            err_str = str(exc)
            if "threadId" in payload and ("404" in err_str or "notFound" in err_str or "not found" in err_str.lower()):
                print("[REPLY DEBUG] Stale/invalid threadId in payload. Retrying send without threadId payload...", flush=True)
                payload.pop("threadId", None)
                try:
                    result = (
                        gmail.users()
                        .messages()
                        .send(
                            userId="me",
                            body=payload,
                        )
                        .execute()
                    )
                    msg_id = result.get("id")
                    ret_thread_id = result.get("threadId")

                    print("[REPLY DEBUG] RETRY SEND SUCCESS CONFIRMED:", flush=True)
                    print(f"  Gmail Message ID: {msg_id}", flush=True)
                    print(f"  Thread ID: {ret_thread_id}", flush=True)
                    print("=" * 60, flush=True)

                    return msg_id
                except Exception as retry_exc:
                    exc = retry_exc

            print("[REPLY DEBUG] GMAIL API SEND ERROR:", flush=True)
            print(f"  Error: {exc}", flush=True)
            print("=" * 60, flush=True)
            raise