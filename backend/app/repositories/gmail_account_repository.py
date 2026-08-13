from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.email_log import EmailLog
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
    statement = (
        select(GmailAccount)
        .where(GmailAccount.id == gmail_account_id)
        .options(selectinload(GmailAccount.candidate))
    )
    return db.scalar(statement)


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
    active_only: bool = True,
) -> list[GmailAccount]:
    statement = select(GmailAccount).options(selectinload(GmailAccount.candidate))
    if active_only:
        statement = statement.where(GmailAccount.is_active.is_(True))
    statement = statement.order_by(GmailAccount.id)

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
    has_logs = db.scalar(
        select(func.count(EmailLog.id)).where(
            EmailLog.gmail_account_id == gmail_account.id
        )
    ) or 0

    if has_logs > 0:
        gmail_account.is_active = False
        gmail_account.refresh_token = ""
        db.commit()
        db.refresh(gmail_account)
    else:
        db.delete(gmail_account)
        db.commit()