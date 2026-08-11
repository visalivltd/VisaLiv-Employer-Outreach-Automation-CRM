from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings

from app.api.v1.auth import router as auth_router
from app.api.v1.candidate import router as candidate_router
from app.api.v1.employer import router as employer_router
from app.api.v1.gmail_account import router as gmail_account_router
from app.api.v1.gmail_oauth import router as gmail_oauth_router
from app.api.v1.outreach import router as outreach_router
from app.api.v1.email_log import router as email_log_router


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(candidate_router)
app.include_router(employer_router)
app.include_router(gmail_account_router)
app.include_router(gmail_oauth_router)
app.include_router(outreach_router)
app.include_router(email_log_router)

@app.get("/")
async def root():
    return {
        "success": True,
        "message": "VisaLiv CRM Backend Running",
    }