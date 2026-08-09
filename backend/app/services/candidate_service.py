from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.repositories import candidate_repository
from app.schemas.candidate import CandidateCreate, CandidateUpdate


def create_candidate(
    db: Session,
    data: CandidateCreate,
) -> Candidate:
    existing_candidate = candidate_repository.get_candidate_by_email(
        db,
        data.email,
    )

    if existing_candidate:
        raise ValueError("Candidate with this email already exists")

    candidate = Candidate(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        country=data.country,
        visa_type=data.visa_type,
        cv_file_path=data.cv_file_path,
    )

    return candidate_repository.create_candidate(db, candidate)


def get_candidate(
    db: Session,
    candidate_id: int,
) -> Candidate | None:
    return candidate_repository.get_candidate_by_id(
        db,
        candidate_id,
    )


def get_candidates(
    db: Session,
) -> list[Candidate]:
    return candidate_repository.get_candidates(db)


def update_candidate(
    db: Session,
    candidate_id: int,
    data: CandidateUpdate,
) -> Candidate | None:
    candidate = candidate_repository.get_candidate_by_id(
        db,
        candidate_id,
    )

    if candidate is None:
        return None

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(candidate, field, value)

    return candidate_repository.update_candidate(db, candidate)


def delete_candidate(
    db: Session,
    candidate_id: int,
) -> bool:
    candidate = candidate_repository.get_candidate_by_id(
        db,
        candidate_id,
    )

    if candidate is None:
        return False

    candidate_repository.delete_candidate(db, candidate)

    return True