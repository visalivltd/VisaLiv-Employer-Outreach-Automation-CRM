from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(20),
    )

    country: Mapped[str | None] = mapped_column(
        String(100),
    )

    visa_type: Mapped[str | None] = mapped_column(
        String(100),
    )

    cv_file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    email_draft_id: Mapped[int | None] = mapped_column(
        ForeignKey("email_drafts.id"),
        nullable=True,
    )

    real_candidate_id: Mapped[int | None] = mapped_column(
        ForeignKey("real_candidates.id"),
        nullable=True,
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
    real_candidate = relationship(
        "RealCandidate",
        back_populates="candidates",
    )

    gmail_account = relationship(
        "GmailAccount",
        back_populates="candidate",
        uselist=False,
    )

    email_logs = relationship(
        "EmailLog",
        back_populates="candidate",
    )

    scheduler_jobs = relationship(
        "SchedulerJob",
        back_populates="candidate",
    )

    email_draft = relationship(
        "EmailDraft",
        back_populates="candidates",
    )

    @property
    def gmail_email(self) -> str | None:
        if self.gmail_account and self.gmail_account.is_active:
            return self.gmail_account.gmail_email
        return None

    @property
    def email_draft_name(self) -> str | None:
        if self.email_draft:
            return self.email_draft.draft_name
        return None

    @property
    def email_draft_subject(self) -> str | None:
        if self.email_draft:
            return self.email_draft.subject
        return None

    @property
    def email_draft_body(self) -> str | None:
        if self.email_draft:
            return self.email_draft.body
        return None

    @property
    def email_draft_info(self) -> dict | None:
        if self.email_draft:
            return {
                "id": self.email_draft.id,
                "draft_name": self.email_draft.draft_name,
                "subject": self.email_draft.subject,
                "has_attachment": self.email_draft.has_attachment,
            }
        return None