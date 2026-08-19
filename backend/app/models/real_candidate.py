from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class RealCandidate(Base):
    __tablename__ = "real_candidates"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    real_candidate_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    summary_sender_gmail_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("gmail_accounts.id"),
        nullable=True,
    )

    summary_template_subject: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    summary_template_body: Mapped[Text | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    candidates = relationship(
        "Candidate",
        back_populates="real_candidate",
    )

    summary_sender_gmail_account = relationship(
        "GmailAccount",
    )
