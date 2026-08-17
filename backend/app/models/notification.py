from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    type: Mapped[str] = mapped_column(
        String(50),
        default="employer_reply",
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    candidate_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidates.id"),
        nullable=True,
    )

    employer_id: Mapped[int | None] = mapped_column(
        ForeignKey("employers.id"),
        nullable=True,
    )

    email_log_id: Mapped[int | None] = mapped_column(
        ForeignKey("email_logs.id"),
        nullable=True,
    )

    gmail_message_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    candidate = relationship(
        "Candidate",
    )

    employer = relationship(
        "Employer",
    )

    email_log = relationship(
        "EmailLog",
    )
