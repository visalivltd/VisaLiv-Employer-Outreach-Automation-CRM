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
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.email_draft import router as email_draft_router
from app.api.v1.notification import router as notification_router
from app.api.v1.email_tracking import router as email_tracking_router
from app.api.v1.real_candidate import router as real_candidate_router


import asyncio
from contextlib import asynccontextmanager

def _run_sync():
    from app.db.session import SessionLocal
    from app.services.gmail_sync_service import sync_incoming_replies
    db = SessionLocal()
    try:
        sync_incoming_replies(db)
    finally:
        db.close()


async def periodic_gmail_sync():
    """Background polling loop that syncs incoming Gmail emails every 60 seconds."""
    await asyncio.sleep(60)
    while True:
        try:
            await asyncio.to_thread(_run_sync)
        except Exception as exc:
            print(f"[BACKGROUND GMAIL SYNC ERROR] {exc}", flush=True)

        await asyncio.sleep(60)


def _run_outreach_worker_sync():
    from app.db.session import SessionLocal
    from app.services.outreach_service import OutreachService
    db = SessionLocal()
    try:
        OutreachService.process_due_outreach_jobs(db, max_jobs=50)
    finally:
        db.close()


async def periodic_outreach_worker():
    """Background polling loop that checks for and processes due outreach jobs every 15 seconds."""
    await asyncio.sleep(5)
    while True:
        try:
            await asyncio.to_thread(_run_outreach_worker_sync)
        except Exception as exc:
            print(f"[BACKGROUND OUTREACH WORKER ERROR] {exc}", flush=True)

        await asyncio.sleep(15)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.base import Base
    from app.db.session import engine
    # Ensure missing database tables (like oauth_states, outreach_jobs) are created
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"[STARTUP TABLE CREATE WARNING] {exc}", flush=True)

    # Start background polling tasks on server startup
    sync_task = asyncio.create_task(periodic_gmail_sync())
    outreach_task = asyncio.create_task(periodic_outreach_worker())
    yield
    sync_task.cancel()
    outreach_task.cancel()



app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

import mimetypes
from fastapi import HTTPException, Response, status
from app.services.storage_service import storage_service

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/uploads/{file_path:path}")
def serve_upload_file(file_path: str):
    clean_rel = f"uploads/{file_path.strip().lstrip('/')}"
    try:
        data = storage_service.get_file_bytes(clean_rel)
        media_type, _ = mimetypes.guess_type(clean_rel)
        return Response(content=data, media_type=media_type or "application/octet-stream")
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_path}",
        ) from exc

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://visaliv-crm-frontend-477131280275.asia-south2.run.app",
        
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
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
app.include_router(outreach_router, prefix="/api/v1")

app.include_router(email_log_router)
app.include_router(dashboard_router)
app.include_router(email_draft_router)
app.include_router(notification_router)
app.include_router(email_tracking_router)
app.include_router(real_candidate_router)


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "VisaLiv CRM Backend Running",
    }