from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class EmailDraftCreate(BaseModel):
    name: str | None = None
    subject: str | None = None
    body: str | None = None
    attachment_filename: str | None = None
    attachment_path: str | None = None


class EmailDraftUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    body: str | None = None
    attachment_filename: str | None = None
    attachment_path: str | None = None
    remove_attachment: bool | None = None


class EmailDraftResponse(BaseModel):
    id: int
    name: str | None = None
    subject: str | None = None
    body: str | None = None
    attachment_filename: str | None = None
    attachment_path: str | None = None
    assigned_candidate_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
