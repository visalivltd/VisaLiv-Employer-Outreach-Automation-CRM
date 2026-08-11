import base64
import hashlib
import hmac
import json
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.candidate import Candidate
from app.models.gmail_account import GmailAccount


router = APIRouter(
    prefix="/gmail-oauth",
    tags=["Gmail OAuth"],
)


GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"

GOOGLE_IDENTITY_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
]

STATE_EXPIRY_SECONDS = 600


def create_flow(
    code_verifier: str | None = None,
) -> Flow:
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [
                settings.GOOGLE_REDIRECT_URI
            ],
        }
    }

    return Flow.from_client_config(
        client_config,
        scopes=[
            GMAIL_SEND_SCOPE,
            *GOOGLE_IDENTITY_SCOPES,
        ],
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        code_verifier=code_verifier,
        autogenerate_code_verifier=(
            code_verifier is None
        ),
    )


def create_state(
    candidate_id: int,
    code_verifier: str,
) -> str:
    payload = {
        "candidate_id": candidate_id,
        "code_verifier": code_verifier,
        "timestamp": int(time.time()),
        "nonce": secrets.token_urlsafe(16),
    }

    payload_bytes = json.dumps(
        payload,
        separators=(",", ":"),
    ).encode()

    encoded_payload = base64.urlsafe_b64encode(
        payload_bytes
    ).decode().rstrip("=")

    signature = hmac.new(
        settings.JWT_SECRET_KEY.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{encoded_payload}.{signature}"


def verify_state(
    state: str,
) -> tuple[int, str]:
    try:
        encoded_payload, signature = state.split(
            ".",
            1,
        )

        expected_signature = hmac.new(
            settings.JWT_SECRET_KEY.encode(),
            encoded_payload.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(
            signature,
            expected_signature,
        ):
            raise ValueError(
                "Invalid state signature"
            )

        padding = "=" * (
            -len(encoded_payload) % 4
        )

        payload = json.loads(
            base64.urlsafe_b64decode(
                encoded_payload + padding
            ).decode()
        )

        if (
            time.time()
            - payload["timestamp"]
            > STATE_EXPIRY_SECONDS
        ):
            raise ValueError(
                "OAuth state expired"
            )

        return (
            int(payload["candidate_id"]),
            payload["code_verifier"],
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state",
        ) from exc


@router.get("/connect/{candidate_id}")
def connect_gmail(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    candidate = db.get(
        Candidate,
        candidate_id,
    )

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found",
        )

    # Generate ONE PKCE verifier for this OAuth flow.
    code_verifier = secrets.token_urlsafe(64)

    flow = create_flow(
        code_verifier=code_verifier,
    )

    state = create_state(
        candidate_id=candidate_id,
        code_verifier=code_verifier,
    )

    authorization_url, _ = (
        flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            state=state,
        )
    )

    return RedirectResponse(
        url=authorization_url
    )


@router.get("/callback")
def gmail_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    candidate_id, code_verifier = verify_state(
        state
    )

    candidate = db.get(
        Candidate,
        candidate_id,
    )

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found",
        )

    # Re-create the Flow with the SAME PKCE
    # verifier used during authorization.
    flow = create_flow(
        code_verifier=code_verifier,
    )

    try:
        flow.fetch_token(
            code=code,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Google OAuth failed: {exc}",
        ) from exc

    credentials = flow.credentials

    if not credentials.refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Google did not return a refresh token",
        )

    # Get the authenticated Google account email
    # from the ID token instead of Gmail API profile.
    if not credentials.id_token:
        raise HTTPException(
            status_code=400,
            detail="Google did not return an ID token",
        )

    try:
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Google identity verification "
                f"failed: {exc}"
            ),
        ) from exc

    gmail_email = id_info.get("email")

    if not gmail_email:
        raise HTTPException(
            status_code=400,
            detail="Google account email not available",
        )

    # Check whether this candidate already has
    # a Gmail account connected.
    existing_account = (
        db.query(GmailAccount)
        .filter(
            GmailAccount.candidate_id
            == candidate_id
        )
        .first()
    )

    if existing_account:
        existing_account.gmail_email = gmail_email
        existing_account.refresh_token = (
            credentials.refresh_token
        )
        existing_account.is_active = True

    else:
        gmail_account = GmailAccount(
            candidate_id=candidate_id,
            gmail_email=gmail_email,
            refresh_token=credentials.refresh_token,
            is_active=True,
        )

        db.add(gmail_account)

    db.commit()

    return {
        "success": True,
        "message": (
            "Gmail account connected successfully"
        ),
        "candidate_id": candidate_id,
        "gmail_email": gmail_email,
    }