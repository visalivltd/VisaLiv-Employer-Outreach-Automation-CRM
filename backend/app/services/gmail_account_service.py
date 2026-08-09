from sqlalchemy.orm import Session

from app.models.gmail_account import GmailAccount
from app.repositories import gmail_account_repository
from app.schemas.gmail_account import (
    GmailAccountCreate,
    GmailAccountUpdate,
)


def create_gmail_account(
    db: Session,
    data: GmailAccountCreate,
) -> GmailAccount:
    existing_candidate_account = (
        gmail_account_repository.get_gmail_account_by_candidate_id(
            db,
            data.candidate_id,
        )
    )

    if existing_candidate_account:
        raise ValueError(
            "This candidate already has a Gmail account"
        )

    existing_email_account = (
        gmail_account_repository.get_gmail_account_by_email(
            db,
            data.gmail_email,
        )
    )

    if existing_email_account:
        raise ValueError(
            "This Gmail email is already connected"
        )

    gmail_account = GmailAccount(
        candidate_id=data.candidate_id,
        gmail_email=data.gmail_email,
        refresh_token=data.refresh_token,
    )

    return gmail_account_repository.create_gmail_account(
        db,
        gmail_account,
    )


def get_gmail_account(
    db: Session,
    gmail_account_id: int,
) -> GmailAccount | None:
    return gmail_account_repository.get_gmail_account_by_id(
        db,
        gmail_account_id,
    )


def get_gmail_account_by_candidate(
    db: Session,
    candidate_id: int,
) -> GmailAccount | None:
    return gmail_account_repository.get_gmail_account_by_candidate_id(
        db,
        candidate_id,
    )


def get_gmail_accounts(
    db: Session,
) -> list[GmailAccount]:
    return gmail_account_repository.get_gmail_accounts(db)


def update_gmail_account(
    db: Session,
    gmail_account_id: int,
    data: GmailAccountUpdate,
) -> GmailAccount | None:
    gmail_account = gmail_account_repository.get_gmail_account_by_id(
        db,
        gmail_account_id,
    )

    if gmail_account is None:
        return None

    update_data = data.model_dump(exclude_unset=True)

    if "gmail_email" in update_data:
        existing_email_account = (
            gmail_account_repository.get_gmail_account_by_email(
                db,
                update_data["gmail_email"],
            )
        )

        if (
            existing_email_account
            and existing_email_account.id != gmail_account.id
        ):
            raise ValueError(
                "This Gmail email is already connected"
            )

    for field, value in update_data.items():
        setattr(gmail_account, field, value)

    return gmail_account_repository.update_gmail_account(
        db,
        gmail_account,
    )


def delete_gmail_account(
    db: Session,
    gmail_account_id: int,
) -> bool:
    gmail_account = gmail_account_repository.get_gmail_account_by_id(
        db,
        gmail_account_id,
    )

    if gmail_account is None:
        return False

    gmail_account_repository.delete_gmail_account(
        db,
        gmail_account,
    )

    return True