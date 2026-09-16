import logging
from arq.connections import RedisSettings, create_pool, ArqRedis
from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_pool: ArqRedis | None = None


def parse_redis_url(url: str) -> RedisSettings:
    """Parse redis://[[username]:[password]@]host[:port][/db] into RedisSettings."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    password = parsed.password
    db = 0
    if parsed.path and len(parsed.path) > 1:
        try:
            db = int(parsed.path[1:])
        except ValueError:
            pass

    return RedisSettings(
        host=host,
        port=port,
        password=password,
        database=db,
        conn_timeout=3,
    )


def get_redis_settings() -> RedisSettings:
    return parse_redis_url(settings.REDIS_URL)


async def check_redis_online() -> bool:
    """Check if Redis server is reachable."""
    if not settings.ENABLE_REDIS_QUEUE:
        return False
    try:
        pool = await create_pool(get_redis_settings())
        await pool.ping()
        await pool.close()
        return True
    except Exception as exc:
        logger.warning(f"[REDIS QUEUE CHECK] Redis ping failed: {exc}")
        return False


async def get_redis_pool() -> ArqRedis | None:
    global _redis_pool
    if not settings.ENABLE_REDIS_QUEUE:
        return None

    if _redis_pool is None:
        try:
            _redis_pool = await create_pool(get_redis_settings())
        except Exception as exc:
            logger.error(f"[REDIS QUEUE ERROR] Could not create Redis pool: {exc}")
            return None
    return _redis_pool


async def close_redis_pool():
    global _redis_pool
    if _redis_pool:
        await _redis_pool.close()
        _redis_pool = None
