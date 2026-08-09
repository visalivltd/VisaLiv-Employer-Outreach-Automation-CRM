from sqlalchemy.orm import Session

from app.models.employer import Employer
from app.repositories import employer_repository
from app.schemas.employer import EmployerCreate, EmployerUpdate


def create_employer(
    db: Session,
    data: EmployerCreate,
) -> Employer:
    existing_employer = employer_repository.get_employer_by_email(
        db,
        data.email,
    )

    if existing_employer:
        raise ValueError("Employer with this email already exists")

    employer = Employer(
        company_name=data.company_name,
        contact_person=data.contact_person,
        email=data.email,
        country=data.country,
        website=data.website,
        industry=data.industry,
    )

    return employer_repository.create_employer(db, employer)


def get_employer(
    db: Session,
    employer_id: int,
) -> Employer | None:
    return employer_repository.get_employer_by_id(
        db,
        employer_id,
    )


def get_employers(
    db: Session,
) -> list[Employer]:
    return employer_repository.get_employers(db)


def update_employer(
    db: Session,
    employer_id: int,
    data: EmployerUpdate,
) -> Employer | None:
    employer = employer_repository.get_employer_by_id(
        db,
        employer_id,
    )

    if employer is None:
        return None

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(employer, field, value)

    return employer_repository.update_employer(db, employer)


def delete_employer(
    db: Session,
    employer_id: int,
) -> bool:
    employer = employer_repository.get_employer_by_id(
        db,
        employer_id,
    )

    if employer is None:
        return False

    employer_repository.delete_employer(db, employer)

    return True