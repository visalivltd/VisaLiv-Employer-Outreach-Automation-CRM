from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmployerCreate(BaseModel):
    company_name: str
    contact_person: str | None = None
    email: str
    country: str | None = None
    website: str | None = None
    industry: str | None = None


class EmployerUpdate(BaseModel):
    company_name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    country: str | None = None
    website: str | None = None
    industry: str | None = None
    is_active: bool | None = None


class EmployerResponse(BaseModel):
    id: int
    company_name: str
    contact_person: str | None
    email: str
    country: str | None
    website: str | None
    industry: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)