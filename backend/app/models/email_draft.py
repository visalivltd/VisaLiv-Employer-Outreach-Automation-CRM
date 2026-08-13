from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class EmailDraft(Base):
    __tablename__ = "email_drafts"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    name: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )

    subject: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    body: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    attachment_filename: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    attachment_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
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

    candidates = relationship(
        "Candidate",
        back_populates="email_draft",
    )

    @property
    def draft_name(self) -> str:
        name_val = self.name if (self.name and self.name.strip() and self.name.strip().lower() != "none") else None
        subj_val = self.subject if (self.subject and self.subject.strip() and self.subject.strip().lower() != "none") else None
        att_val = self.attachment_filename if (self.attachment_filename and self.attachment_filename.strip()) else None

        return name_val or att_val or subj_val or f"Draft #{self.id}"

    @property
    def has_attachment(self) -> bool:
        return bool(self.attachment_path)

    @property
    def assigned_candidate_name(self) -> str | None:
        if self.candidates:
            names = [c.full_name for c in self.candidates if c.full_name]
            return ", ".join(names) if names else None
        return None
