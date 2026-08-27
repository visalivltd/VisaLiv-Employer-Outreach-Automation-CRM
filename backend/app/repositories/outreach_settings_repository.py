from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outreach_settings import OutreachSettings


def get_outreach_settings(db: Session) -> OutreachSettings:
    statement = select(OutreachSettings).where(OutreachSettings.id == 1)
    settings = db.scalar(statement)

    if settings is None:
        settings = OutreachSettings(
            id=1,
            max_emails_per_candidate_per_day=5,
            min_gap_minutes=60,
            enabled=True,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


def update_outreach_settings(
    db: Session,
    max_emails_per_candidate_per_day: int,
    min_gap_minutes: int,
    enabled: bool,
) -> OutreachSettings:
    settings = get_outreach_settings(db)

    # Enforce safe boundaries
    safe_max_emails = max(1, min(20, max_emails_per_candidate_per_day))
    safe_min_gap = max(0, min_gap_minutes)

    settings.max_emails_per_candidate_per_day = safe_max_emails
    settings.min_gap_minutes = safe_min_gap
    settings.enabled = enabled

    db.commit()
    db.refresh(settings)
    return settings
