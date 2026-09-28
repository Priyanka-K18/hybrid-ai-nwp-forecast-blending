"""
Open-Meteo Provider — fetches raw forecast data from the Open-Meteo API.
Handles ECMWF (dedicated endpoint), GFS, and ICON (via multi-model forecast endpoint).
"""
import logging
import time
from typing import Dict, Any, Optional, List
import urllib.request
import urllib.parse
import json

from app.weather.config import (
    OPENMETEO_BASE_URL,
    OPENMETEO_ECMWF_URL,
    OPENMETEO_TIMEOUT_SECONDS,
    HOURLY_VARIABLES,
    OPTIONAL_VARIABLES,
    SUPPORTED_MODELS,
    ECMWF_ENDPOINT_MODEL,
)

logger = logging.getLogger("weather.openmeteo")


def _build_hourly_params() -> str:
    """Return comma-joined hourly variable string for URL."""
    return ",".join(HOURLY_VARIABLES)


def _http_get(url: str, params: Dict[str, str]) -> Dict[str, Any]:
    """
    Simple HTTP GET using stdlib (no extra dependencies needed).
    Returns parsed JSON or raises on failure.
    """
    query = urllib.parse.urlencode(params)
    full_url = f"{url}?{query}"
    logger.debug("GET %s", full_url)

    req = urllib.request.Request(
        full_url,
        headers={"User-Agent": "HybridAIForecast/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=OPENMETEO_TIMEOUT_SECONDS) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Open-Meteo HTTP {e.code}: {body[:300]}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Open-Meteo connection error: {e.reason}") from e
    except TimeoutError as e:
        raise RuntimeError(f"Open-Meteo request timed out after {OPENMETEO_TIMEOUT_SECONDS}s") from e


def fetch_ecmwf_forecast(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Fetches ECMWF IFS forecast from the dedicated ECMWF endpoint.
    """
    params = {
        "latitude": str(latitude),
        "longitude": str(longitude),
        "hourly": _build_hourly_params(),
        "forecast_days": "7",
        "timezone": "auto",
    }
    # cape/visibility not available on all ecmwf endpoint builds — fetch best-effort
    try:
        data = _http_get(OPENMETEO_ECMWF_URL, params)
        return data
    except RuntimeError:
        # Fallback: use main endpoint with ecmwf model
        params_fallback = dict(params)
        params_fallback["models"] = ECMWF_ENDPOINT_MODEL
        return _http_get(OPENMETEO_BASE_URL, params_fallback)


def fetch_model_forecast(
    latitude: float,
    longitude: float,
    model_key: str,
) -> Dict[str, Any]:
    """
    Fetches forecast for a given model (GFS, ICON, etc.) via the main forecast endpoint.
    model_key: one of SUPPORTED_MODELS keys e.g. 'GFS', 'ICON'
    """
    model_param = SUPPORTED_MODELS.get(model_key)
    if not model_param:
        raise ValueError(f"Unsupported model: {model_key}. Supported: {list(SUPPORTED_MODELS.keys())}")

    params = {
        "latitude": str(latitude),
        "longitude": str(longitude),
        "hourly": _build_hourly_params(),
        "models": model_param,
        "forecast_days": "7",
        "timezone": "auto",
    }
    return _http_get(OPENMETEO_BASE_URL, params)


def fetch_all_models(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """
    Fetches all supported models in a single call (when supported by endpoint).
    Falls back to individual calls if multi-model call fails.
    """
    all_models = ",".join(SUPPORTED_MODELS.values())
    params = {
        "latitude": str(latitude),
        "longitude": str(longitude),
        "hourly": _build_hourly_params(),
        "models": all_models,
        "forecast_days": "7",
        "timezone": "auto",
    }
    return _http_get(OPENMETEO_BASE_URL, params)
