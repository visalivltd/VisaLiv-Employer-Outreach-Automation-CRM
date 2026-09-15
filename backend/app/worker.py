import asyncio
import logging
from arq.cron import cron
from app.core.redis import get_redis_settings
from app.jobs.tasks import task_process_due_outreach_jobs, task_sync_incoming_replies

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def startup(ctx: dict):
    logger.info("[REDIS WORKER] Worker process starting up...")


async def shutdown(ctx: dict):
    logger.info("[REDIS WORKER] Worker process shutting down...")


class WorkerSettings:
    functions = [
        task_process_due_outreach_jobs,
        task_sync_incoming_replies,
    ]
    cron_jobs = [
        cron(task_process_due_outreach_jobs, second=set(range(0, 60, 15)), unique=True),
        cron(task_sync_incoming_replies, second=0, unique=True),
    ]
    redis_settings = get_redis_settings()
    on_startup = startup
    on_shutdown = shutdown
    max_jobs = 10
    job_timeout = 300


if __name__ == "__main__":
    from arq import run_worker
    from app.core.redis import check_redis_online
    
    if not asyncio.run(check_redis_online()):
        logger.error(
            "\n" + "=" * 70 + "\n"
            "[REDIS WORKER ERROR] Redis server is NOT running on localhost:6379!\n\n"
            "• Local Dev (No Redis): You do NOT need to run `python -m app.worker`.\n"
            "  The main FastAPI backend handles jobs automatically in Local Fallback Mode.\n\n"
            "• With Redis: Ensure Redis service is running locally (e.g. via Docker)\n"
            "  or set a valid REDIS_URL (e.g., Upstash Redis) in backend/.env.\n"
            + "=" * 70 + "\n"
        )
    else:
        run_worker(WorkerSettings)

