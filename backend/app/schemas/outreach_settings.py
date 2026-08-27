from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class OutreachSettingsResponse(BaseModel):
    id: int = 1
    max_emails_per_candidate_per_day: int
    min_gap_minutes: int
    enabled: bool
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class OutreachSettingsUpdate(BaseModel):
    max_emails_per_candidate_per_day: int = Field(..., ge=1, le=20)
    min_gap_minutes: int = Field(..., ge=0)
    enabled: bool = True
