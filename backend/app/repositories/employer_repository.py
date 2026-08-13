from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.email_log import EmailLog
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
    active_only: bool = True,
) -> Employer | None:
    statement = select(Employer).where(Employer.email == email)
    if active_only:
        statement = statement.where(Employer.is_active.is_(True))

    return db.scalar(statement)


def get_employers(
    db: Session,
    active_only: bool = True,
) -> list[Employer]:
    statement = select(Employer)
    if active_only:
        statement = statement.where(Employer.is_active.is_(True))
    statement = statement.order_by(Employer.id)

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
    try:
        has_logs = db.scalar(
            select(func.count(EmailLog.id)).where(
                EmailLog.employer_id == employer.id
            )
        ) or 0

        if has_logs > 0:
            employer.is_active = False
            if not employer.email.endswith(f"_deleted_{employer.id}"):
                employer.email = f"{employer.email}_deleted_{employer.id}"
            db.commit()
            db.refresh(employer)
        else:
            db.delete(employer)
            db.commit()
    except Exception:
        db.rollback()
        raise