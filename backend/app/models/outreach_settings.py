from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class OutreachSettings(Base):
    __tablename__ = "outreach_settings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        default=1,
    )

    max_emails_per_candidate_per_day: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )

    min_gap_minutes: Mapped[int] = mapped_column(
        Integer,
        default=60,
        nullable=False,
    )

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
