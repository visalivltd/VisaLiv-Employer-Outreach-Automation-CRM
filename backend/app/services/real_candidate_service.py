from sqlalchemy.orm import Session

from app.models.real_candidate import RealCandidate
from app.repositories import real_candidate_repository
from app.schemas.real_candidate import RealCandidateCreate, RealCandidateUpdate


def get_real_candidates(db: Session) -> list[RealCandidate]:
    return real_candidate_repository.get_real_candidates(db)


def get_real_candidate(db: Session, real_candidate_pk: int) -> RealCandidate | None:
    return real_candidate_repository.get_real_candidate_by_id(db, real_candidate_pk)


def create_real_candidate(db: Session, data: RealCandidateCreate) -> RealCandidate:
    return real_candidate_repository.create_real_candidate(db, data)


def update_real_candidate(
    db: Session,
    real_candidate_pk: int,
    data: RealCandidateUpdate,
) -> RealCandidate | None:
    return real_candidate_repository.update_real_candidate(db, real_candidate_pk, data)


def delete_real_candidate(db: Session, real_candidate_pk: int) -> bool:
    real_cand = real_candidate_repository.get_real_candidate_by_id(db, real_candidate_pk)
    if real_cand is None:
        return False

    real_candidate_repository.delete_real_candidate(db, real_cand)
    return True
