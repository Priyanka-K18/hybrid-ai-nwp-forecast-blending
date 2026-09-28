"""
Historical weather data fetcher from Open-Meteo Archive API.
Used to compute real observed values for model validation.
"""
import logging
import urllib.request
import urllib.parse
import json
import datetime
from typing import Dict, Any, Optional, List

from app.weather.config import (
    OPENMETEO_HISTORICAL_URL,
    OPENMETEO_TIMEOUT_SECONDS,
    HOURLY_VARIABLES,
)

logger = logging.getLogger("weather.historical")


def fetch_historical_weather(
    latitude: float,
    longitude: float,
    start_date: str,      # "YYYY-MM-DD"
    end_date: str,        # "YYYY-MM-DD"
) -> Dict[str, Any]:
    """
    Fetches historical observed weather from Open-Meteo Archive API.
    Returns raw API response or error dict.
    """
    # Archive API supports a subset of variables
    archive_vars = [
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation",
        "wind_speed_10m",
        "wind_direction_10m",
        "surface_pressure",
        "cloud_cover",
    ]

    params = {
        "latitude": str(latitude),
        "longitude": str(longitude),
        "start_date": start_date,
        "end_date": end_date,
        "hourly": ",".join(archive_vars),
        "timezone": "auto",
    }
    query = urllib.parse.urlencode(params)
    full_url = f"{OPENMETEO_HISTORICAL_URL}?{query}"
    logger.info("Fetching historical data: %s → %s for (%.4f, %.4f)",
                start_date, end_date, latitude, longitude)

    try:
        req = urllib.request.Request(full_url, headers={"User-Agent": "HybridAIForecast/1.0"})
        with urllib.request.urlopen(req, timeout=OPENMETEO_TIMEOUT_SECONDS) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return {"success": True, "data": data}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.warning("Historical API HTTP %d: %s", e.code, body[:200])
        return {"success": False, "error": f"HTTP {e.code}: {body[:200]}"}
    except Exception as e:
        logger.warning("Historical API error: %s", e)
        return {"success": False, "error": str(e)}


def compute_historical_metrics(
    latitude: float,
    longitude: float,
    days_back: int = 7,
) -> Dict[str, Any]:
    """
    Fetches recent historical data and computes basic daily statistics.
    Used to provide real reference observations for model validation.

    Returns:
        {
          "success": bool,
          "period": {"start": str, "end": str},
          "daily_summary": list of {date, temp_max, temp_min, precip_total, wind_max},
          "period_means": {temperature, precipitation, wind_speed},
          "error": str | None,
          "data_source": "Open-Meteo Archive"
        }
    """
    today = datetime.date.today()
    end_date = (today - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    start_date = (today - datetime.timedelta(days=days_back)).strftime("%Y-%m-%d")

    result = fetch_historical_weather(latitude, longitude, start_date, end_date)
    if not result["success"]:
        return {
            "success": False,
            "period": {"start": start_date, "end": end_date},
            "daily_summary": [],
            "period_means": {},
            "error": result.get("error", "Unknown error"),
            "data_source": "Open-Meteo Archive",
            "note": "Historical data unavailable — metrics cannot be computed.",
        }

    hourly = result["data"].get("hourly", {})
    times: List[str] = hourly.get("time", [])
    temps  = hourly.get("temperature_2m", [])
    precip = hourly.get("precipitation", [])
    winds  = hourly.get("wind_speed_10m", [])

    if not times:
        return {
            "success": False,
            "period": {"start": start_date, "end": end_date},
            "daily_summary": [],
            "period_means": {},
            "error": "Empty time series returned",
            "data_source": "Open-Meteo Archive",
        }

    # Group by day
    daily: Dict[str, Dict[str, List[float]]] = {}
    for i, t in enumerate(times):
        day = t[:10]  # YYYY-MM-DD
        if day not in daily:
            daily[day] = {"temps": [], "precip": [], "winds": []}
        if i < len(temps) and temps[i] is not None:
            daily[day]["temps"].append(temps[i])
        if i < len(precip) and precip[i] is not None:
            daily[day]["precip"].append(precip[i])
        if i < len(winds) and winds[i] is not None:
            daily[day]["winds"].append(winds[i])

    daily_summary = []
    all_temps, all_precip, all_winds = [], [], []

    for day in sorted(daily.keys()):
        d = daily[day]
        t_vals = d["temps"]
        p_vals = d["precip"]
        w_vals = d["winds"]

        entry = {
            "date": day,
            "temp_max": round(max(t_vals), 1) if t_vals else None,
            "temp_min": round(min(t_vals), 1) if t_vals else None,
            "temp_mean": round(sum(t_vals) / len(t_vals), 1) if t_vals else None,
            "precip_total": round(sum(p_vals), 2) if p_vals else None,
            "wind_max": round(max(w_vals), 1) if w_vals else None,
            "wind_mean": round(sum(w_vals) / len(w_vals), 1) if w_vals else None,
        }
        daily_summary.append(entry)
        all_temps.extend(t_vals)
        all_precip.extend(p_vals)
        all_winds.extend(w_vals)

    period_means = {
        "temperature": round(sum(all_temps) / len(all_temps), 2) if all_temps else None,
        "precipitation": round(sum(all_precip), 2) if all_precip else None,
        "wind_speed": round(sum(all_winds) / len(all_winds), 2) if all_winds else None,
    }

    return {
        "success": True,
        "period": {"start": start_date, "end": end_date},
        "daily_summary": daily_summary,
        "period_means": period_means,
        "error": None,
        "data_source": "Open-Meteo Archive (ERA5-based reanalysis)",
        "note": "Historical observed values. Real metrics require paired forecast-observation matching.",
    }
