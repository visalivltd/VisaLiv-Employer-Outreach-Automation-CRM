from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CandidateCreate(BaseModel):
    full_name: str
    email: str
    phone: str | None = None
    country: str | None = None
    visa_type: str | None = None
    cv_file_path: str


class CandidateUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    country: str | None = None
    visa_type: str | None = None
    cv_file_path: str | None = None
    is_active: bool | None = None


class CandidateResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None
    country: str | None
    visa_type: str | None
    cv_file_path: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)