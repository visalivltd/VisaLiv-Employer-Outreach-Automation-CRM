from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CandidateCreate(BaseModel):
    full_name: str
    email: str
    phone: str | None = None
    country: str | None = None
    visa_type: str | None = None
    cv_file_path: str
    email_draft_id: int | None = None


class CandidateUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    country: str | None = None
    visa_type: str | None = None
    cv_file_path: str | None = None
    email_draft_id: int | None = None
    is_active: bool | None = None


class EmailDraftInfo(BaseModel):
    id: int
    draft_name: str | None = None
    subject: str | None = None
    has_attachment: bool = False

    model_config = ConfigDict(from_attributes=True)


class CandidateResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None
    country: str | None
    visa_type: str | None
    cv_file_path: str
    is_active: bool
    gmail_email: str | None = None
    email_draft_id: int | None = None
    email_draft_name: str | None = None
    email_draft_subject: str | None = None
    email_draft_body: str | None = None
    email_draft: EmailDraftInfo | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateAssignDraft(BaseModel):
    email_draft_id: int | None = None