import logging
from app.db.session import SessionLocal
from app.services.outreach_service import OutreachService
from app.services.gmail_sync_service import sync_incoming_replies

logger = logging.getLogger(__name__)


async def task_process_due_outreach_jobs(ctx: dict, max_jobs: int = 50) -> dict:
    """Background task to process due outreach email jobs in queue worker."""
    db = SessionLocal()
    try:
        result = OutreachService.process_due_outreach_jobs(db, max_jobs=max_jobs)
        logger.info(f"[REDIS WORKER] Outreach processing completed: {result}")
        return result
    except Exception as exc:
        logger.error(f"[REDIS WORKER ERROR] Failed to process outreach jobs: {exc}")
        raise
    finally:
        db.close()


async def task_sync_incoming_replies(ctx: dict) -> dict:
    """Background task to sync incoming Gmail replies in queue worker."""
    db = SessionLocal()
    try:
        sync_incoming_replies(db)
        logger.info("[REDIS WORKER] Gmail sync completed successfully.")
        return {"status": "success"}
    except Exception as exc:
        logger.error(f"[REDIS WORKER ERROR] Failed to sync incoming replies: {exc}")
        raise
    finally:
        db.close()
