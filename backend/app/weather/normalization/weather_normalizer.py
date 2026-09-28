"""
Normalization Layer — converts raw Open-Meteo API responses into the
canonical NormalizedForecast internal structure.

This is the single point where Open-Meteo's response schema is parsed.
The rest of the application depends ONLY on this structure.
"""
from typing import Dict, Any, List, Optional
import datetime
import statistics
import logging

from app.weather.config import FORECAST_SUMMARY_HOURS, OPTIONAL_VARIABLES

logger = logging.getLogger("weather.normalizer")


def _safe_mean(values: List[Optional[float]]) -> Optional[float]:
    """Mean of a list, ignoring None/null values. Returns None if all null."""
    clean = [v for v in values if v is not None]
    if not clean:
        return None
    return round(statistics.mean(clean), 2)


def _safe_sum(values: List[Optional[float]]) -> Optional[float]:
    """Sum ignoring None values. Returns None if all null."""
    clean = [v for v in values if v is not None]
    if not clean:
        return None
    return round(sum(clean), 2)


def _safe_max(values: List[Optional[float]]) -> Optional[float]:
    clean = [v for v in values if v is not None]
    if not clean:
        return None
    return max(clean)


def normalize_openmeteo_response(
    raw: Dict[str, Any],
    model_name: str,
    location_name: str,
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """
    Converts a raw Open-Meteo API response (hourly arrays) into the
    normalized internal forecast structure.

    Returns a dict conforming to:
    {
      "location": { "name", "latitude", "longitude" },
      "model": str,
      "source": "Open-Meteo",
      "retrieved_at": ISO timestamp,
      "forecast_time": ISO timestamp of first hour,
      "data_available": bool,
      "error": str | None,
      "summary_24h": {
        "temperature_mean": float | None,
        "temperature_max": float | None,
        "temperature_min": float | None,
        "precipitation_total": float | None,
        "wind_speed_mean": float | None,
        "wind_speed_max": float | None,
        "wind_direction_mean": float | None,
        "humidity_mean": float | None,
        "pressure_mean": float | None,
        "cloud_cover_mean": float | None,
        "cape_max": float | None,
        "precip_prob_max": float | None,
        "visibility_mean": float | None,
      },
      "hourly_data": list of dicts (raw per-hour values, first 72h)
    }
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    location = {
        "name": location_name,
        "latitude": latitude,
        "longitude": longitude,
    }

    if "hourly" not in raw or not raw["hourly"]:
        return {
            "location": location,
            "model": model_name,
            "source": "Open-Meteo",
            "retrieved_at": now,
            "forecast_time": None,
            "data_available": False,
            "error": "No hourly data in API response",
            "summary_24h": {},
            "hourly_data": [],
        }

    hourly = raw["hourly"]
    times: List[str] = hourly.get("time", [])

    if not times:
        return {
            "location": location,
            "model": model_name,
            "source": "Open-Meteo",
            "retrieved_at": now,
            "forecast_time": None,
            "data_available": False,
            "error": "Empty time series in API response",
            "summary_24h": {},
            "hourly_data": [],
        }

    # First FORECAST_SUMMARY_HOURS data points for summary
    n = min(FORECAST_SUMMARY_HOURS, len(times))
    slice_times = times[:n]

    def _slice(key: str) -> List[Optional[float]]:
        vals = hourly.get(key, [])
        return vals[:n] if vals else [None] * n

    temp      = _slice("temperature_2m")
    humidity  = _slice("relative_humidity_2m")
    precip    = _slice("precipitation")
    wind_spd  = _slice("wind_speed_10m")
    wind_dir  = _slice("wind_direction_10m")
    pressure  = _slice("surface_pressure")
    cloud     = _slice("cloud_cover")
    cape      = _slice("cape")
    precip_p  = _slice("precipitation_probability")
    vis       = _slice("visibility")

    # Summary for first 24h window
    summary = {
        "temperature_mean":   _safe_mean(temp),
        "temperature_max":    _safe_max(temp),
        "temperature_min":    (min([v for v in temp if v is not None]) if any(v is not None for v in temp) else None),
        "precipitation_total": _safe_sum(precip),
        "wind_speed_mean":    _safe_mean(wind_spd),
        "wind_speed_max":     _safe_max(wind_spd),
        "wind_direction_mean": _safe_mean(wind_dir),
        "humidity_mean":      _safe_mean(humidity),
        "pressure_mean":      _safe_mean(pressure),
        "cloud_cover_mean":   _safe_mean(cloud),
        "cape_max":           _safe_max(cape),
        "precip_prob_max":    _safe_max(precip_p),
        "visibility_mean":    _safe_mean(vis),
    }

    # Build hourly_data list (first 72h = 72 entries max)
    n_hourly = min(72, len(times))
    hourly_data = []
    for i in range(n_hourly):
        entry: Dict[str, Any] = {"time": times[i]}
        for key in [
            "temperature_2m", "relative_humidity_2m", "precipitation",
            "wind_speed_10m", "wind_direction_10m", "surface_pressure",
            "cloud_cover", "cape", "precipitation_probability",
            "visibility", "weather_code",
        ]:
            vals = hourly.get(key, [])
            entry[key] = vals[i] if i < len(vals) else None
        hourly_data.append(entry)

    return {
        "location": location,
        "model": model_name,
        "source": "Open-Meteo",
        "retrieved_at": now,
        "forecast_time": times[0] if times else None,
        "data_available": True,
        "error": None,
        "summary_24h": summary,
        "hourly_data": hourly_data,
        # Keep top-level convenience fields matching the spec
        "temperature": summary["temperature_mean"],
        "precipitation": summary["precipitation_total"],
        "wind_speed": summary["wind_speed_mean"],
        "wind_direction": summary["wind_direction_mean"],
        "humidity": summary["humidity_mean"],
        "pressure": summary["pressure_mean"],
        "cloud_cover": summary["cloud_cover_mean"],
    }
