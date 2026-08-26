import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.candidate import Candidate
from app.models.gmail_account import GmailAccount
from app.models.oauth_state import OAuthState
from app.models.system_gmail_account import SystemGmailAccount


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
        }
    }
    return Flow.from_client_config(
        client_config=client_config,
        scopes=OAUTH_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        code_verifier=code_verifier,
        autogenerate_code_verifier=(
            code_verifier is None
        ),
    )


def create_state(
    db: Session,
    purpose: str,
    candidate_id: int | None,
    code_verifier: str,
) -> str:
    now = datetime.now(timezone.utc)

    # Cleanup expired states to maintain optimal table performance
    db.query(OAuthState).filter(OAuthState.expires_at < now).delete(synchronize_session=False)

    state_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(seconds=STATE_EXPIRY_SECONDS)

    oauth_state = OAuthState(
        state=state_token,
        purpose=purpose,
        candidate_id=candidate_id,
        code_verifier=code_verifier,
        expires_at=expires_at,
        created_at=now,
    )
    db.add(oauth_state)
    db.commit()

    state_hash = hashlib.sha256(state_token.encode("utf-8")).hexdigest()[:12]
    print(
        f"[GMAIL OAUTH STATE CREATED] purpose={purpose} candidate_id={candidate_id} "
        f"state_hash={state_hash} expires_at={expires_at.isoformat()}",
        flush=True,
    )

    return state_token


def verify_state(
    db: Session,
    state: str,
) -> OAuthState:
    if not state:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state",
        )

    oauth_state = db.get(OAuthState, state)

    if oauth_state is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state",
        )

    now = datetime.now(timezone.utc)
    expires_at = oauth_state.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        db.delete(oauth_state)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state",
        )

    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()[:12]
    print(
        f"[GMAIL OAUTH STATE VERIFIED] purpose={oauth_state.purpose} candidate_id={oauth_state.candidate_id} "
        f"state_hash={state_hash}",
        flush=True,
    )

    return oauth_state


@router.get("/system-account")
def get_system_account_status(
    db: Session = Depends(get_db),
):
    account = (
        db.query(SystemGmailAccount)
        .filter(
            (func.lower(SystemGmailAccount.gmail_email) == "support@visaliv.com") | (SystemGmailAccount.is_active.is_(True))
        )
        .first()
    )

    if account is None or not account.is_active:
        return {
            "connected": False,
            "gmail_email": None,
        }

    return {
        "connected": True,
        "gmail_email": account.gmail_email,
    }


@router.get("/connect-system", operation_id="connect_system_gmail")
def connect_system_gmail(
    db: Session = Depends(get_db),
):
    code_verifier = secrets.token_urlsafe(64)

    flow = create_flow(
        code_verifier=code_verifier,
    )

    state = create_state(
        db=db,
        purpose="system_gmail",
        candidate_id=None,
        code_verifier=code_verifier,
    )

    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
    )

    return RedirectResponse(
        url=authorization_url,
        status_code=302,
    )


@router.get("/connect/{candidate_id}", operation_id="connect_candidate_gmail")
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

    code_verifier = secrets.token_urlsafe(64)

    flow = create_flow(
        code_verifier=code_verifier,
    )

    state = create_state(
        db=db,
        purpose="candidate_gmail",
        candidate_id=candidate_id,
        code_verifier=code_verifier,
    )

    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
    )

    return RedirectResponse(
        url=authorization_url,
        status_code=302,
    )


def handle_system_gmail_callback(
    db: Session,
    code: str,
    code_verifier: str,
    oauth_state: OAuthState,
) -> RedirectResponse:
    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
    flow = create_flow(code_verifier=code_verifier)
    try:
        flow.fetch_token(code=code)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Google OAuth failed: {exc}") from exc

    credentials = flow.credentials

    granted_scopes = set(credentials.scopes or [])
    missing_scopes = []
    if GMAIL_SEND_SCOPE not in granted_scopes:
        missing_scopes.append("Gmail Send")
    if GMAIL_READONLY_SCOPE not in granted_scopes:
        missing_scopes.append("Gmail Read / Sync")

    if missing_scopes:
        raise HTTPException(
            status_code=400,
            detail=f"Required Gmail permissions missing ({', '.join(missing_scopes)}). Please reconnect and grant all requested permissions.",
        )

    if not credentials.refresh_token:
        raise HTTPException(status_code=400, detail="Google did not return a refresh token. Please reconnect Gmail.")

    if not credentials.id_token:
        raise HTTPException(status_code=400, detail="Google did not return an ID token.")

    try:
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Google identity verification failed: {exc}") from exc

    gmail_email = id_info.get("email")
    if not gmail_email:
        raise HTTPException(status_code=400, detail="Google account email not available.")

    print(f"[SYSTEM GMAIL OAUTH] email={gmail_email}", flush=True)

    try:
        gmail_test_client = build("gmail", "v1", credentials=credentials)
        gmail_test_client.users().getProfile(userId="me").execute()
    except Exception as test_exc:
        raise HTTPException(
            status_code=400,
            detail=f"Gmail read permission verification failed ({test_exc}). Please reconnect Gmail and ensure you grant full access.",
        ) from test_exc

    if gmail_email.lower() != "support@visaliv.com":
        raise HTTPException(
            status_code=400,
            detail="Please connect support@visaliv.com as the Daily Summary Sender.",
        )

    existing_account = (
        db.query(SystemGmailAccount)
        .filter(
            func.lower(SystemGmailAccount.gmail_email) == "support@visaliv.com"
        )
        .first()
    )

    if existing_account:
        existing_account.gmail_email = gmail_email
        existing_account.refresh_token = credentials.refresh_token
        existing_account.is_active = True
    else:
        system_account = SystemGmailAccount(
            gmail_email=gmail_email,
            refresh_token=credentials.refresh_token,
            is_active=True,
        )
        db.add(system_account)

    db.delete(oauth_state)
    db.commit()

    frontend_base = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(url=f"{frontend_base}/real-candidates?success=true&email={gmail_email}")


def handle_candidate_gmail_callback(
    db: Session,
    code: str,
    code_verifier: str,
    candidate_id: int | None,
    oauth_state: OAuthState,
) -> RedirectResponse:
    if not candidate_id:
        raise HTTPException(status_code=400, detail="Candidate ID is required for candidate Gmail OAuth.")

    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")

    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
    flow = create_flow(code_verifier=code_verifier)
    try:
        flow.fetch_token(code=code)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Google OAuth failed: {exc}") from exc

    credentials = flow.credentials

    granted_scopes = set(credentials.scopes or [])
    missing_scopes = []
    if GMAIL_SEND_SCOPE not in granted_scopes:
        missing_scopes.append("Gmail Send")
    if GMAIL_READONLY_SCOPE not in granted_scopes:
        missing_scopes.append("Gmail Read / Sync")

    if missing_scopes:
        raise HTTPException(
            status_code=400,
            detail=f"Required Gmail permissions missing ({', '.join(missing_scopes)}). Please reconnect and grant all requested permissions.",
        )

    if not credentials.refresh_token:
        raise HTTPException(status_code=400, detail="Google did not return a refresh token. Please reconnect Gmail.")

    if not credentials.id_token:
        raise HTTPException(status_code=400, detail="Google did not return an ID token.")

    try:
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Google identity verification failed: {exc}") from exc

    gmail_email = id_info.get("email")
    if not gmail_email:
        raise HTTPException(status_code=400, detail="Google account email not available.")

    print(f"[CANDIDATE GMAIL OAUTH] email={gmail_email} candidate_id={candidate_id}", flush=True)

    try:
        gmail_test_client = build("gmail", "v1", credentials=credentials)
        gmail_test_client.users().getProfile(userId="me").execute()
    except Exception as test_exc:
        raise HTTPException(
            status_code=400,
            detail=f"Gmail read permission verification failed ({test_exc}). Please reconnect Gmail and ensure you grant full access.",
        ) from test_exc

    existing_account = (
        db.query(GmailAccount)
        .filter(GmailAccount.candidate_id == candidate_id)
        .first()
    )
    if existing_account:
        existing_account.gmail_email = gmail_email
        existing_account.refresh_token = credentials.refresh_token
        existing_account.account_type = "outreach"
        existing_account.is_active = True
    else:
        gmail_account = GmailAccount(
            candidate_id=candidate_id,
            gmail_email=gmail_email,
            refresh_token=credentials.refresh_token,
            account_type="outreach",
            is_active=True,
        )
        db.add(gmail_account)

    db.delete(oauth_state)
    db.commit()

    frontend_base = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(url=f"{frontend_base}/gmail-accounts?success=true&email={gmail_email}&candidate_id={candidate_id}")


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

    oauth_state = verify_state(
        db=db,
        state=state,
    )

    purpose = oauth_state.purpose
    candidate_id = oauth_state.candidate_id
    code_verifier = oauth_state.code_verifier

    if purpose == "system_gmail":
        return handle_system_gmail_callback(
            db=db,
            code=code,
            code_verifier=code_verifier,
            oauth_state=oauth_state,
        )
    elif purpose == "candidate_gmail":
        return handle_candidate_gmail_callback(
            db=db,
            code=code,
            code_verifier=code_verifier,
            candidate_id=candidate_id,
            oauth_state=oauth_state,
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state",
        )