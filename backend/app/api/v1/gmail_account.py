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


@router.get(
    "",
    response_model=list[GmailAccountResponse],
)
def get_gmail_accounts(
    db: Session = Depends(get_db),
):
    return gmail_account_service.get_gmail_accounts(db)


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

    return gmail_account


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