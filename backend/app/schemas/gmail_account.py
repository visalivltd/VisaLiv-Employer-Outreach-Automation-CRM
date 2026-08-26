from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GmailAccountCreate(BaseModel):
    candidate_id: int | None = None
    gmail_email: str
    refresh_token: str
    account_type: str = "outreach"


class GmailAccountUpdate(BaseModel):
    gmail_email: str | None = None
    refresh_token: str | None = None
    account_type: str | None = None
    is_active: bool | None = None


class GmailAccountResponse(BaseModel):
    id: int
    candidate_id: int | None = None
    candidate_name: str | None = None
    gmail_email: str
    account_type: str = "outreach"
    is_active: bool
    has_send_scope: bool = True
    has_read_scope: bool = True
    requires_reauthorization: bool = False
    connected_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)