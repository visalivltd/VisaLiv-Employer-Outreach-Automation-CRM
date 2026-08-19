from datetime import datetime
from pydantic import BaseModel, ConfigDict


class EmployerCreate(BaseModel):
    service_name: str | None = None
    email: str | None = None
    country: str | None = None
    industry: str | None = None
    service_website: str | None = None
    hr_email: str | None = None
    recruitment_email: str | None = None
    careers_email: str | None = None
    manager_email: str | None = None
    info_email: str | None = None
    general_email: str | None = None
    primary_email_type: str | None = None


class EmployerUpdate(BaseModel):
    service_name: str | None = None
    email: str | None = None
    country: str | None = None
    industry: str | None = None
    service_website: str | None = None
    hr_email: str | None = None
    recruitment_email: str | None = None
    careers_email: str | None = None
    manager_email: str | None = None
    info_email: str | None = None
    general_email: str | None = None
    primary_email_type: str | None = None
    is_active: bool | None = None


class EmployerResponse(BaseModel):
    id: int
    service_name: str | None = None
    email: str | None = None
    country: str | None = None
    industry: str | None = None
    service_website: str | None = None
    hr_email: str | None = None
    recruitment_email: str | None = None
    careers_email: str | None = None
    manager_email: str | None = None
    info_email: str | None = None
    general_email: str | None = None
    primary_email_type: str | None = None
    import_order: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployerImportPreviewRow(BaseModel):
    row_number: int
    service_name: str | None = None
    service_website: str | None = None
    primary_email: str | None = None
    primary_email_type: str | None = None
    hr_email: str | None = None
    recruitment_email: str | None = None
    careers_email: str | None = None
    manager_email: str | None = None
    info_email: str | None = None
    general_email: str | None = None
    status: str  # "Ready", "Duplicate", "No Email", "Invalid"
    status_reason: str | None = None


class EmployerImportPreviewResponse(BaseModel):
    total_rows: int
    valid_count: int
    duplicate_count: int
    no_email_count: int
    invalid_rows_count: int
    rows: list[EmployerImportPreviewRow]


class EmployerImportResultResponse(BaseModel):
    success: bool
    total_rows: int
    imported_count: int
    skipped_duplicates_count: int
    no_email_count: int
    invalid_rows_count: int
    message: str
    details: list[dict] | None = None