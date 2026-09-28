"""
In-memory cache for Open-Meteo responses.
Key: (latitude, longitude, model_name)  →  (timestamp, payload)
Respects WEATHER_CACHE_TTL from config.
"""
import time
import hashlib
import logging
from typing import Dict, Any, Optional, Tuple

from app.weather.config import WEATHER_CACHE_TTL

logger = logging.getLogger("weather.cache")

# Internal store: key → (fetched_at_unix, payload)
_CACHE: Dict[str, Tuple[float, Any]] = {}
_HITS = 0
_MISSES = 0


def _make_key(latitude: float, longitude: float, model: str) -> str:
    raw = f"{round(latitude, 4)}:{round(longitude, 4)}:{model}"
    return hashlib.md5(raw.encode()).hexdigest()


def get_cached(latitude: float, longitude: float, model: str) -> Optional[Any]:
    """
    Returns cached payload if still within TTL, otherwise None.
    """
    global _HITS, _MISSES
    key = _make_key(latitude, longitude, model)
    if key not in _CACHE:
        _MISSES += 1
        return None
    fetched_at, payload = _CACHE[key]
    age = time.time() - fetched_at
    if age > WEATHER_CACHE_TTL:
        logger.debug("Cache STALE for %s@(%.4f,%.4f) — age %.0fs > TTL %ds",
                     model, latitude, longitude, age, WEATHER_CACHE_TTL)
        del _CACHE[key]
        _MISSES += 1
        return None
    _HITS += 1
    logger.debug("Cache HIT for %s@(%.4f,%.4f) — age %.0fs", model, latitude, longitude, age)
    return payload


def set_cache(latitude: float, longitude: float, model: str, payload: Any) -> None:
    """Stores payload in cache with current timestamp."""
    key = _make_key(latitude, longitude, model)
    _CACHE[key] = (time.time(), payload)
    logger.debug("Cache SET for %s@(%.4f,%.4f)", model, latitude, longitude)


set_cached = set_cache


def invalidate(latitude: float, longitude: float, model: str) -> None:
    """Removes a specific cache entry."""
    key = _make_key(latitude, longitude, model)
    _CACHE.pop(key, None)


def invalidate_all() -> int:
    """Clears all cached entries. Returns number of entries removed."""
    count = len(_CACHE)
    _CACHE.clear()
    return count


def cache_stats() -> Dict[str, Any]:
    """Returns stats about the current cache state."""
    now = time.time()
    valid = sum(1 for (ts, _) in _CACHE.values() if (now - ts) <= WEATHER_CACHE_TTL)
    return {
        "total_entries": len(_CACHE),
        "valid_entries": valid,
        "active_entries": valid,
        "stale_entries": len(_CACHE) - valid,
        "ttl_seconds": WEATHER_CACHE_TTL,
        "hits": _HITS,
        "misses": _MISSES,
    }
