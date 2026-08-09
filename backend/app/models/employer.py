from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Employer(Base):
    __tablename__ = "employers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    company_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    contact_person: Mapped[str | None] = mapped_column(
        String(255)
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(100)
    )

    website: Mapped[str | None] = mapped_column(
        String(255)
    )

    industry: Mapped[str | None] = mapped_column(
        String(100)
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    email_logs = relationship(
        "EmailLog",
        back_populates="employer",
    )