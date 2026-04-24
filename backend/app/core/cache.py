import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── TTL constants ─────────────────────────────────────────────
TTL_5_MIN  = 300   # stats endpoints
TTL_1_MIN  = 60    # fast-changing data
TTL_30_MIN = 1800  # slow-changing data

# ── Redis client singleton ────────────────────────────────────
_redis: Optional[aioredis.Redis] = None


async def get_redis() -> Optional[aioredis.Redis]:
    """
    Returns async Redis client.
    Returns None if Redis is unavailable — allows graceful fallback.
    """
    global _redis
    if _redis is None:
        try:
            _redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            await _redis.ping()
        except Exception as e:
            logger.warning(f"Redis unavailable — running without cache: {e}")
            _redis = None
    return _redis


async def cache_get(key: str) -> Optional[Any]:
    """
    Get a cached value by key.
    Returns None if key not found or Redis is unavailable.
    """
    try:
        r = await get_redis()
        if r is None:
            return None
        value = await r.get(key)
        if value:
            logger.debug(f"Cache HIT: {key}")
            return json.loads(value)
        logger.debug(f"Cache MISS: {key}")
        return None
    except Exception as e:
        logger.warning(f"Cache get error for {key}: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int = TTL_5_MIN) -> None:
    """
    Store a value in cache with TTL in seconds.
    Silently fails if Redis is unavailable.
    """
    try:
        r = await get_redis()
        if r is None:
            return
        await r.setex(key, ttl, json.dumps(value))
        logger.debug(f"Cache SET: {key} (TTL={ttl}s)")
    except Exception as e:
        logger.warning(f"Cache set error for {key}: {e}")


async def cache_delete(key: str) -> None:
    """Delete a single cache key."""
    try:
        r = await get_redis()
        if r is None:
            return
        await r.delete(key)
        logger.debug(f"Cache DELETE: {key}")
    except Exception as e:
        logger.warning(f"Cache delete error for {key}: {e}")


async def cache_delete_pattern(pattern: str) -> int:
    """
    Delete all keys matching a pattern.
    e.g. cache_delete_pattern("warroom:stats:*")
    Returns number of keys deleted.
    """
    try:
        r = await get_redis()
        if r is None:
            return 0
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
            logger.info(f"Cache invalidated {len(keys)} key(s) matching: {pattern}")
            return len(keys)
        return 0
    except Exception as e:
        logger.warning(f"Cache delete pattern error for {pattern}: {e}")
        return 0


async def invalidate_stats_cache() -> None:
    """
    Invalidate all stats and analytics cache keys.
    Called by scheduler after ingestion completes.
    """
    patterns = [
        "warroom:stats:*",
        "warroom:analytics:*",
    ]
    total = 0
    for pattern in patterns:
        total += await cache_delete_pattern(pattern)
    logger.info(f"Stats cache fully invalidated — {total} key(s) cleared")
