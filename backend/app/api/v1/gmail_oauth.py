import os
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
GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

GOOGLE_IDENTITY_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
]

OAUTH_SCOPES = [
    GMAIL_SEND_SCOPE,
    GMAIL_READONLY_SCOPE,
    *GOOGLE_IDENTITY_SCOPES,
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
        scopes=OAUTH_SCOPES,
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

    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
    )

    return RedirectResponse(
        url=authorization_url
    )


@router.get("/callback")
def gmail_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
):
    # Handle Google OAuth error if user denied access or authorization failed
    if error:
        if error == "access_denied":
            raise HTTPException(
                status_code=400,
                detail="Gmail authorization was denied. Please try Connect Gmail again and allow the requested Gmail permissions.",
            )
        detail_msg = f"Google OAuth authorization error: {error}"
        if error_description:
            detail_msg += f" ({error_description})"
        raise HTTPException(
            status_code=400,
            detail=detail_msg,
        )

    if not code:
        raise HTTPException(
            status_code=400,
            detail="Authorization code is missing from Google response.",
        )

    if not state:
        raise HTTPException(
            status_code=400,
            detail="State parameter is missing from Google response.",
        )

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

    # Re-create the Flow with the SAME PKCE verifier used during authorization.
    # Set OAUTHLIB_RELAX_TOKEN_SCOPE=1 so oauthlib does not fail due to scope ordering/formatting.
    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

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

    # Verify that BOTH gmail.send and gmail.readonly scopes were explicitly granted by the user
    granted_scopes = set(credentials.scopes or [])
    missing_scopes = []
    if GMAIL_SEND_SCOPE not in granted_scopes:
        missing_scopes.append("Gmail Send")
    if GMAIL_READONLY_SCOPE not in granted_scopes:
        missing_scopes.append("Gmail Read / Sync")

    if missing_scopes:
        raise HTTPException(
            status_code=400,
            detail=f"Required Gmail permissions missing ({', '.join(missing_scopes)}). Please reconnect the Gmail account and grant all requested permissions.",
        )

    if not credentials.refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Google did not return a refresh token. Please reconnect Gmail.",
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

    print(f"[GMAIL OAUTH] email={gmail_email}", flush=True)
    print(f"[GMAIL OAUTH] granted_scopes={credentials.scopes}", flush=True)

    # IMMEDIATELY VERIFY CREDENTIALS WITH LIVE API CALLS BEFORE SAVING TO DB
    from googleapiclient.discovery import build
    try:
        gmail_test_client = build("gmail", "v1", credentials=credentials)
        profile_res = gmail_test_client.users().getProfile(userId="me").execute()
        print(f"[GMAIL OAUTH TEST] getProfile() HTTP 200 OK! Profile email: {profile_res.get('emailAddress')}", flush=True)

        list_res = gmail_test_client.users().messages().list(userId="me", maxResults=1).execute()
        print(f"[GMAIL OAUTH TEST SUCCESS] Account {gmail_email} messages.list() HTTP 200 OK! Message count sample: {len(list_res.get('messages', []))}", flush=True)
    except Exception as test_exc:
        err_str = str(test_exc)
        print(f"[GMAIL OAUTH TEST FAILED] Account {gmail_email} verification failed: {err_str}", flush=True)
        raise HTTPException(
            status_code=400,
            detail=f"Gmail read permission verification failed ({err_str}). Please reconnect Gmail and ensure you grant full access.",
        ) from test_exc

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

    # Redirect user back to Frontend Gmail Accounts page with success notification
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    frontend_url = f"{frontend_base}/gmail-accounts?success=true&email={gmail_email}&candidate_id={candidate_id}"
    return RedirectResponse(url=frontend_url)