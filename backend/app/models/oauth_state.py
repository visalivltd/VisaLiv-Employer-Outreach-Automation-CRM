from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OAuthState(Base):
    __tablename__ = "oauth_states"

    state: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
        index=True,
    )

    purpose: Mapped[str] = mapped_column(
        String(50),
        default="candidate_gmail",
        nullable=False,
    )

    candidate_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    code_verifier: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
