from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GmailAccountCreate(BaseModel):
    candidate_id: int
    gmail_email: str
    refresh_token: str


class GmailAccountUpdate(BaseModel):
    gmail_email: str | None = None
    refresh_token: str | None = None
    is_active: bool | None = None


class GmailAccountResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str | None = None
    gmail_email: str
    is_active: bool
    connected_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)