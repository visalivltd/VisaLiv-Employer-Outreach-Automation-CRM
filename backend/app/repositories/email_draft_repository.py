from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.candidate import Candidate
from app.models.email_draft import EmailDraft


def create_email_draft(
    db: Session,
    draft: EmailDraft,
) -> EmailDraft:
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return draft


def get_email_draft_by_id(
    db: Session,
    draft_id: int,
) -> EmailDraft | None:
    return db.scalar(select(EmailDraft).where(EmailDraft.id == draft_id).options(selectinload(EmailDraft.candidates)))


def get_email_draft_by_name(
    db: Session,
    name: str,
) -> EmailDraft | None:
    statement = select(EmailDraft).where(EmailDraft.name == name)

    return db.scalar(statement)


def get_email_drafts(
    db: Session,
) -> list[EmailDraft]:
    statement = select(EmailDraft).options(selectinload(EmailDraft.candidates)).order_by(EmailDraft.id)

    return list(db.scalars(statement).all())


def update_email_draft(
    db: Session,
    draft: EmailDraft,
) -> EmailDraft:
    db.commit()
    db.refresh(draft)

    return draft


def delete_email_draft(
    db: Session,
    draft: EmailDraft,
) -> None:
    db.query(Candidate).filter(Candidate.email_draft_id == draft.id).update(
        {"email_draft_id": None},
        synchronize_session=False,
    )
    db.delete(draft)
    db.commit()
