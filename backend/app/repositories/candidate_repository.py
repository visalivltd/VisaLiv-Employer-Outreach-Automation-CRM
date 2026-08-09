from sqlalchemy import select
from sqlalchemy.orm import Session

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
    return db.get(Candidate, candidate_id)


def get_candidate_by_email(
    db: Session,
    email: str,
) -> Candidate | None:
    statement = select(Candidate).where(Candidate.email == email)

    return db.scalar(statement)


def get_candidates(
    db: Session,
) -> list[Candidate]:
    statement = select(Candidate).order_by(Candidate.id)

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
    db.delete(candidate)
    db.commit()