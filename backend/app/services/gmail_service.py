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
PROJECT_ROOT = Path(__file__).resolve().parents[2]


class GmailService:
    def __init__(
        self,
        refresh_token: str,
    ):
        self.refresh_token = refresh_token

    def _get_credentials(self) -> Credentials:
        credentials = Credentials(
            token=None,
            refresh_token=self.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=[GMAIL_SEND_SCOPE],
        )

        try:
            credentials.refresh(Request())
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Google Gmail authentication failed: {exc}",
            ) from exc

        return credentials

    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        attachment_paths: list[str] | None = None,
    ) -> str:
        credentials = self._get_credentials()

        gmail = build(
            "gmail",
            "v1",
            credentials=credentials,
        )

        message = EmailMessage()
        message["To"] = to_email
        message["Subject"] = subject
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
                file_path = PROJECT_ROOT / path_str

            if file_path.exists() and file_path.is_file():
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

        result = (
            gmail.users()
            .messages()
            .send(
                userId="me",
                body={"raw": encoded_message},
            )
            .execute()
        )

        return result["id"]