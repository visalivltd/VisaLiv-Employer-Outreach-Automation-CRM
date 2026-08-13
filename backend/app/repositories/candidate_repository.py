from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.candidate import Candidate


def create_candidate(
    db: Session,
    candidate: Candidate,
) -> Candidate:
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return candidate


def get_candidate_by_id(
    db: Session,
    candidate_id: int,
) -> Candidate | None:
    statement = (
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .options(
            selectinload(Candidate.gmail_account),
            selectinload(Candidate.email_draft),
        )
    )
    return db.scalar(statement)


def get_candidate_by_email(
    db: Session,
    email: str,
) -> Candidate | None:
    statement = select(Candidate).where(Candidate.email == email)

    return db.scalar(statement)


def get_candidates(
    db: Session,
    active_only: bool = False,
) -> list[Candidate]:
    statement = select(Candidate).options(
        selectinload(Candidate.gmail_account),
        selectinload(Candidate.email_draft),
    )
    if active_only:
        statement = statement.where(Candidate.is_active.is_(True))
    statement = statement.order_by(Candidate.id)

    return list(db.scalars(statement).all())


def update_candidate(
    db: Session,
    candidate: Candidate,
) -> Candidate:
    db.commit()
    db.refresh(candidate)

    return candidate


def delete_candidate(
    db: Session,
    candidate: Candidate,
) -> None:
    if candidate.gmail_account:
        db.delete(candidate.gmail_account)
    if candidate.scheduler_jobs:
        for job in list(candidate.scheduler_jobs):
            db.delete(job)
    if candidate.email_logs:
        for log in list(candidate.email_logs):
            db.delete(log)
    db.delete(candidate)
    db.commit()