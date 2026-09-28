"""
Geocoding service — resolves city name → (lat, lon) via Open-Meteo Geocoding API.
Results are cached in-memory for the session lifetime.
"""
import logging
import urllib.request
import urllib.parse
import json
from typing import Optional, Tuple, Dict, Any

from app.weather.config import OPENMETEO_GEOCODING_URL, OPENMETEO_TIMEOUT_SECONDS

logger = logging.getLogger("weather.geocoding")

_GEOCODE_CACHE: Dict[str, Optional[Dict[str, Any]]] = {}


def geocode_city(city_name: str, count: int = 1) -> Optional[Dict[str, Any]]:
    """
    Resolves city name to geocoding result.
    Returns dict with 'name', 'latitude', 'longitude', 'country', 'admin1' or None.
    """
    key = city_name.strip().lower()
    if key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[key]

    params = {
        "name": city_name.strip(),
        "count": str(count),
        "language": "en",
        "format": "json",
    }
    query = urllib.parse.urlencode(params)
    full_url = f"{OPENMETEO_GEOCODING_URL}?{query}"
    logger.info("Geocoding city: %s", city_name)

    try:
        req = urllib.request.Request(full_url, headers={"User-Agent": "HybridAIForecast/1.0"})
        with urllib.request.urlopen(req, timeout=OPENMETEO_TIMEOUT_SECONDS) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.warning("Geocoding failed for '%s': %s", city_name, e)
        _GEOCODE_CACHE[key] = None
        return None

    results = data.get("results", [])
    if not results:
        logger.warning("No geocoding results for '%s'", city_name)
        _GEOCODE_CACHE[key] = None
        return None

    best = results[0]
    result = {
        "name": best.get("name", city_name),
        "latitude": float(best["latitude"]),
        "longitude": float(best["longitude"]),
        "country": best.get("country", ""),
        "country_code": best.get("country_code", ""),
        "admin1": best.get("admin1", ""),
        "timezone": best.get("timezone", ""),
    }
    _GEOCODE_CACHE[key] = result
    return result
