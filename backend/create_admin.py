from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin import Admin


def create_admin():
    db: Session = SessionLocal()

    try:
        existing_admin = (
            db.query(Admin)
            .filter(Admin.email == "admin@visaliv.com")
            .first()
        )

        if existing_admin:
            print("Admin already exists.")
            return

        admin = Admin(
            name="Anshika Arya",
            email="admin@visaliv.com",
            password_hash=hash_password("Admin@123"),
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print("Admin created successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()