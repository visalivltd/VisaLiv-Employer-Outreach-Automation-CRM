from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Employer(Base):
    __tablename__ = "employers"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    service_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(100)
    )

    service_website: Mapped[str | None] = mapped_column(
        String(255)
    )

    industry: Mapped[str | None] = mapped_column(
        String(100)
    )

    hr_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    recruitment_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    careers_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    manager_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    info_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    general_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    primary_email_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    import_order: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        index=True,
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

    email_logs = relationship(
        "EmailLog",
        back_populates="employer",
    )