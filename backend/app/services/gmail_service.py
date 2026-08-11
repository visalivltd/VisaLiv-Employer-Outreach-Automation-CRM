import base64
from email.message import EmailMessage

from fastapi import HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import settings


GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"


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