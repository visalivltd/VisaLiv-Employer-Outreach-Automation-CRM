from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class RealCandidateCreate(BaseModel):
    real_candidate_id: str
    name: str
    email: EmailStr | str
    candidate_ids: list[int] | None = []
    summary_sender_gmail_account_id: int | None = None
    summary_template_subject: str | None = None
    summary_template_body: str | None = None


class RealCandidateUpdate(BaseModel):
    real_candidate_id: str | None = None
    name: str | None = None
    email: EmailStr | str | None = None
    candidate_ids: list[int] | None = None
    summary_sender_gmail_account_id: int | None = None
    summary_template_subject: str | None = None
    summary_template_body: str | None = None


class LinkedCandidateInfo(BaseModel):
    id: int
    full_name: str
    email: str
    gmail_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RealCandidateResponse(BaseModel):
    id: int
    real_candidate_id: str
    name: str
    email: str
    summary_sender_gmail_account_id: int | None = None
    summary_sender_gmail_email: str | None = None
    summary_template_subject: str | None = None
    summary_template_body: str | None = None
    linked_candidate_ids: list[int] = []
    linked_candidates: list[LinkedCandidateInfo] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DailySummaryPreviewRequest(BaseModel):
    subject_template: str | None = None
    body_template: str | None = None


class DailySummaryPreviewResponse(BaseModel):
    subject: str
    body: str
    recipient_email: str
    applications_count: int
    employers_list: list[str]
