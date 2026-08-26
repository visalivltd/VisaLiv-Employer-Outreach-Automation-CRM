from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class GmailAccount(Base):
    __tablename__ = "gmail_accounts"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    candidate_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidates.id"),
        unique=True,
        nullable=True,
    )

    gmail_email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    account_type: Mapped[str] = mapped_column(
        String(50),
        default="outreach",
        server_default="outreach",
        nullable=False,
    )

    refresh_token: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    connected_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    candidate = relationship(
        "Candidate",
        back_populates="gmail_account",
    )

    email_logs = relationship(
        "EmailLog",
        back_populates="gmail_account",
    )

    @property
    def candidate_name(self) -> str | None:
        if self.candidate:
            return self.candidate.full_name
        return None