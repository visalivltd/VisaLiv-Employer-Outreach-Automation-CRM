from fastapi import FastAPI

from app.core.config import settings

from app.api.v1.auth import router as auth_router
from app.api.v1.candidate import router as candidate_router
from app.api.v1.employer import router as employer_router
from app.api.v1.gmail_account import router as gmail_account_router



app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.include_router(auth_router)
app.include_router(candidate_router)
app.include_router(employer_router)
app.include_router(gmail_account_router)

@app.get("/")
async def root():
    return {
        "success": True,
        "message": "VisaLiv CRM Backend Running",
    }