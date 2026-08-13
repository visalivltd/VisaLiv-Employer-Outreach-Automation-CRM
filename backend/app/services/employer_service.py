from sqlalchemy.orm import Session

from app.models.employer import Employer
from app.repositories import employer_repository
from app.schemas.employer import EmployerCreate, EmployerUpdate


def create_employer(
    db: Session,
    data: EmployerCreate,
) -> Employer:
    email = data.email.strip()
    if not email:
        raise ValueError("Email is required")

    if "@" not in email or "." not in email:
        raise ValueError("Please enter a valid email address")

    existing_employer = employer_repository.get_employer_by_email(
        db,
        email,
    )

    if existing_employer:
        raise ValueError("Employer with this email already exists")

    employer = Employer(
        service_name=data.service_name.strip() if data.service_name and data.service_name.strip() else None,
        email=email,
        country=data.country.strip() if data.country and data.country.strip() else None,
        industry=data.industry.strip() if data.industry and data.industry.strip() else None,
        service_website=data.service_website.strip() if data.service_website and data.service_website.strip() else None,
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
    active_only: bool = True,
) -> list[Employer]:
    return employer_repository.get_employers(db, active_only=active_only)


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

    if employer is None or not employer.is_active:
        return False

    employer_repository.delete_employer(db, employer)

    return True