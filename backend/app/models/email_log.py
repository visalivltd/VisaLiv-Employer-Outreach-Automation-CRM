from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class EmailLog(Base):
    __tablename__ = "email_logs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id"),
        nullable=False,
    )

    employer_id: Mapped[int] = mapped_column(
        ForeignKey("employers.id"),
        nullable=False,
    )

    gmail_account_id: Mapped[int] = mapped_column(
        ForeignKey("gmail_accounts.id"),
        nullable=False,
    )

    subject: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    sent_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    gmail_message_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    gmail_thread_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    body: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    snippet: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    direction: Mapped[str] = mapped_column(
        String(20),
        default="outgoing",
        server_default="outgoing",
        nullable=False,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    candidate = relationship(
        "Candidate",
        back_populates="email_logs",
    )

    employer = relationship(
        "Employer",
        back_populates="email_logs",
    )

    gmail_account = relationship(
        "GmailAccount",
        back_populates="email_logs",
    )