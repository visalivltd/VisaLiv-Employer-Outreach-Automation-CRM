from sqlalchemy.orm import Session

from app.models.admin import Admin


def get_admin_by_email(db: Session, email: str) -> Admin | None:
    return (
        db.query(Admin)
        .filter(Admin.email == email)
        .first()
    )