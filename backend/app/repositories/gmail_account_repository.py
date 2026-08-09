from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.gmail_account import GmailAccount


def create_gmail_account(
    db: Session,
    gmail_account: GmailAccount,
) -> GmailAccount:
    db.add(gmail_account)
    db.commit()
    db.refresh(gmail_account)

    return gmail_account


def get_gmail_account_by_id(
    db: Session,
    gmail_account_id: int,
) -> GmailAccount | None:
    return db.get(GmailAccount, gmail_account_id)


def get_gmail_account_by_candidate_id(
    db: Session,
    candidate_id: int,
) -> GmailAccount | None:
    statement = select(GmailAccount).where(
        GmailAccount.candidate_id == candidate_id
    )

    return db.scalar(statement)


def get_gmail_account_by_email(
    db: Session,
    gmail_email: str,
) -> GmailAccount | None:
    statement = select(GmailAccount).where(
        GmailAccount.gmail_email == gmail_email
    )

    return db.scalar(statement)


def get_gmail_accounts(
    db: Session,
) -> list[GmailAccount]:
    statement = select(GmailAccount).order_by(GmailAccount.id)

    return list(db.scalars(statement).all())


def update_gmail_account(
    db: Session,
    gmail_account: GmailAccount,
) -> GmailAccount:
    db.commit()
    db.refresh(gmail_account)

    return gmail_account


def delete_gmail_account(
    db: Session,
    gmail_account: GmailAccount,
) -> None:
    db.delete(gmail_account)
    db.commit()