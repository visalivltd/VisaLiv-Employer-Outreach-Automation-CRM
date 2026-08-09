from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.employer import Employer


def create_employer(
    db: Session,
    employer: Employer,
) -> Employer:
    db.add(employer)
    db.commit()
    db.refresh(employer)

    return employer


def get_employer_by_id(
    db: Session,
    employer_id: int,
) -> Employer | None:
    return db.get(Employer, employer_id)


def get_employer_by_email(
    db: Session,
    email: str,
) -> Employer | None:
    statement = select(Employer).where(Employer.email == email)

    return db.scalar(statement)


def get_employers(
    db: Session,
) -> list[Employer]:
    statement = select(Employer).order_by(Employer.id)

    return list(db.scalars(statement).all())


def update_employer(
    db: Session,
    employer: Employer,
) -> Employer:
    db.commit()
    db.refresh(employer)

    return employer


def delete_employer(
    db: Session,
    employer: Employer,
) -> None:
    db.delete(employer)
    db.commit()