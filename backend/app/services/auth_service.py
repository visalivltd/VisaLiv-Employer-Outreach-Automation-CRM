from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.repositories.admin_repository import get_admin_by_email


def login_admin(db: Session, email: str, password: str) -> str | None:
    admin = get_admin_by_email(db, email)

    if admin is None:
        return None

    if not verify_password(password, admin.password_hash):
        return None

    return create_access_token(
        {
            "sub": admin.email,
        }
    )