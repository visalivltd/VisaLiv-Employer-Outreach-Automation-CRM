from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.gmail_account import (
    GmailAccountCreate,
    GmailAccountResponse,
    GmailAccountUpdate,
)
from app.services import gmail_account_service


router = APIRouter(
    prefix="/gmail-accounts",
    tags=["Gmail Accounts"],
)


@router.post(
    "",
    response_model=GmailAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_gmail_account(
    data: GmailAccountCreate,
    db: Session = Depends(get_db),
):
    try:
        return gmail_account_service.create_gmail_account(
            db,
            data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


def check_account_send_scope(account) -> bool:
    if not account or not account.refresh_token or not account.is_active:
        return False
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from app.core.config import settings
        from app.services.gmail_service import GMAIL_SEND_SCOPE

        creds = Credentials(
            token=None,
            refresh_token=account.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=[GMAIL_SEND_SCOPE],
        )
        creds.refresh(Request())
        return True
    except Exception:
        return False


def check_account_read_scope(account) -> bool:
    if not account or not account.refresh_token or not account.is_active:
        return False
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        from app.core.config import settings

        creds = Credentials(
            token=None,
            refresh_token=account.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=None,
        )
        creds.refresh(Request())
        gmail = build("gmail", "v1", credentials=creds)
        gmail.users().messages().list(userId="me", maxResults=1).execute()
        return True
    except Exception:
        return False


@router.get(
    "/system",
    response_model=GmailAccountResponse | None,
)
def get_system_gmail_account(
    db: Session = Depends(get_db),
):
    from app.models.gmail_account import GmailAccount
    from sqlalchemy import func, or_

    account = (
        db.query(GmailAccount)
        .filter(
            or_(
                GmailAccount.account_type == "system",
                func.lower(GmailAccount.gmail_email) == "support@visaliv.com",
            )
        )
        .first()
    )

    if account is None:
        return None

    has_send = check_account_send_scope(account)
    has_read = check_account_read_scope(account)
    resp = GmailAccountResponse.model_validate(account)
    resp.has_send_scope = has_send
    resp.has_read_scope = has_read
    resp.requires_reauthorization = not (has_send and has_read)
    return resp


@router.get(
    "",
    response_model=list[GmailAccountResponse],
)
def get_gmail_accounts(
    db: Session = Depends(get_db),
):
    accounts = gmail_account_service.get_gmail_accounts(db)
    result = []
    for acc in accounts:
        has_send = check_account_send_scope(acc)
        has_read = check_account_read_scope(acc)
        resp = GmailAccountResponse.model_validate(acc)
        resp.has_send_scope = has_send
        resp.has_read_scope = has_read
        resp.requires_reauthorization = not (has_send and has_read)
        result.append(resp)
    return result


@router.get(
    "/candidate/{candidate_id}",
    response_model=GmailAccountResponse,
)
def get_gmail_account_by_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    gmail_account = (
        gmail_account_service.get_gmail_account_by_candidate(
            db,
            candidate_id,
        )
    )

    if gmail_account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gmail account not found for this candidate",
        )

    has_send = check_account_send_scope(gmail_account)
    has_read = check_account_read_scope(gmail_account)
    resp = GmailAccountResponse.model_validate(gmail_account)
    resp.has_send_scope = has_send
    resp.has_read_scope = has_read
    resp.requires_reauthorization = not (has_send and has_read)
    return resp


@router.get(
    "/{gmail_account_id}",
    response_model=GmailAccountResponse,
)
def get_gmail_account(
    gmail_account_id: int,
    db: Session = Depends(get_db),
):
    gmail_account = gmail_account_service.get_gmail_account(
        db,
        gmail_account_id,
    )

    if gmail_account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gmail account not found",
        )

    return gmail_account


@router.put(
    "/{gmail_account_id}",
    response_model=GmailAccountResponse,
)
def update_gmail_account(
    gmail_account_id: int,
    data: GmailAccountUpdate,
    db: Session = Depends(get_db),
):
    try:
        gmail_account = gmail_account_service.update_gmail_account(
            db,
            gmail_account_id,
            data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if gmail_account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gmail account not found",
        )

    return gmail_account


@router.delete(
    "/{gmail_account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_gmail_account(
    gmail_account_id: int,
    db: Session = Depends(get_db),
):
    deleted = gmail_account_service.delete_gmail_account(
        db,
        gmail_account_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gmail account not found",
        )