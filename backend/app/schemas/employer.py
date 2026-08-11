from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmployerCreate(BaseModel):
    service_name: str
    email: str
    country: str | None = None
    industry: str | None = None
    service_website: str | None = None


class EmployerUpdate(BaseModel):
    service_name: str | None = None
    email: str | None = None
    country: str | None = None
    industry: str | None = None
    service_website: str | None = None
    is_active: bool | None = None


class EmployerResponse(BaseModel):
    id: int
    service_name: str
    email: str
    country: str | None
    industry: str | None
    service_website: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)