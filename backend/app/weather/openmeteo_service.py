"""
Open-Meteo Orchestration Service.
Top-level service called by the API endpoints.
Coordinates: geocoding → fetch → cache → normalize → weight → blend → extreme detect.
"""
import logging
import concurrent.futures
from typing import Dict, Any, Optional, List

from app.weather.providers.openmeteo import fetch_ecmwf_forecast, fetch_model_forecast
from app.weather.normalization.weather_normalizer import normalize_openmeteo_response
from app.weather.cache import get_cached, set_cache
from app.weather.geocoding import geocode_city
from app.weather.openmeteo_weighting import calculate_openmeteo_weights, blend_openmeteo_forecasts
from app.weather.extreme_detector import detect_extreme_events
from app.weather.historical import compute_historical_metrics
from app.weather.config import SUPPORTED_MODELS

logger = logging.getLogger("weather.openmeteo_service")


def _fetch_and_normalize(
    model_key: str,
    latitude: float,
    longitude: float,
    location_name: str,
) -> Dict[str, Any]:
    """Fetches + normalizes a single model. Returns normalized dict."""
    # Check cache first
    cached = get_cached(latitude, longitude, model_key)
    if cached is not None:
        logger.info("Cache HIT: %s @ (%.4f, %.4f)", model_key, latitude, longitude)
        return cached

    logger.info("Fetching %s forecast for (%.4f, %.4f)", model_key, latitude, longitude)
    try:
        if model_key == "ECMWF":
            raw = fetch_ecmwf_forecast(latitude, longitude)
        else:
            raw = fetch_model_forecast(latitude, longitude, model_key)

        normalized = normalize_openmeteo_response(
            raw=raw,
            model_name=model_key,
            location_name=location_name,
            latitude=latitude,
            longitude=longitude,
        )
        set_cache(latitude, longitude, model_key, normalized)
        return normalized

    except Exception as exc:
        logger.error("Failed to fetch %s: %s", model_key, exc)
        return {
            "location": {"name": location_name, "latitude": latitude, "longitude": longitude},
            "model": model_key,
            "source": "Open-Meteo",
            "retrieved_at": None,
            "forecast_time": None,
            "data_available": False,
            "error": str(exc),
            "summary_24h": {},
            "hourly_data": [],
        }


def get_multimodel_forecast(
    latitude: float,
    longitude: float,
    location_name: str = "Custom Location",
    lead_time_hours: int = 24,
    season: str = "Monsoon",
    weather_regime: Optional[str] = None,
    models: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Main entry point: fetches all requested NWP models in parallel,
    normalizes, blends, and detects extreme events.

    Returns the complete blended forecast response.
    """
    requested_models = models or list(SUPPORTED_MODELS.keys())  # ECMWF, GFS, ICON

    # ── Parallel fetch ───────────────────────────────────────────────────────
    normalized_forecasts: Dict[str, Dict[str, Any]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        future_map = {
            executor.submit(
                _fetch_and_normalize, model_key, latitude, longitude, location_name
            ): model_key
            for model_key in requested_models
        }
        for future in concurrent.futures.as_completed(future_map):
            model_key = future_map[future]
            try:
                normalized_forecasts[model_key] = future.result()
            except Exception as exc:
                logger.error("Unexpected error for %s: %s", model_key, exc)
                normalized_forecasts[model_key] = {
                    "data_available": False, "error": str(exc), "model": model_key,
                    "source": "Open-Meteo", "summary_24h": {}, "hourly_data": [],
                    "location": {"name": location_name, "latitude": latitude, "longitude": longitude},
                }

    # ── Determine available models ────────────────────────────────────────────
    available_models = [
        m for m, fc in normalized_forecasts.items() if fc.get("data_available")
    ]

    # ── Auto-detect weather regime from first available forecast if not forced ─
    active_regime = weather_regime
    if not active_regime and available_models:
        first_fc = normalized_forecasts[available_models[0]]
        s = first_fc.get("summary_24h", {})
        # Use the existing WeatherRegimeClassifier from the backend
        try:
            from app.weather_regime.classifier import WeatherRegimeClassifier
            regime_info = WeatherRegimeClassifier.classify(
                region_id="custom",
                season=season,
                rainfall_est=s.get("precipitation_total") or 0.0,
                temp_est=s.get("temperature_mean") or 25.0,
                wind_est=s.get("wind_speed_mean") or 10.0,
                cape_jkg=s.get("cape_max") or 500.0,
            )
            active_regime = regime_info["regime"]
        except Exception:
            active_regime = "Normal"

    # ── Adaptive weights per variable ─────────────────────────────────────────
    weights_precip = calculate_openmeteo_weights(
        variable="precipitation",
        lead_time_hours=lead_time_hours,
        season=season,
        weather_regime=active_regime or "Normal",
        available_models=available_models,
    )
    weights_temp = calculate_openmeteo_weights(
        variable="temperature",
        lead_time_hours=lead_time_hours,
        season=season,
        weather_regime=active_regime or "Normal",
        available_models=available_models,
    )
    weights_wind = calculate_openmeteo_weights(
        variable="wind_speed",
        lead_time_hours=lead_time_hours,
        season=season,
        weather_regime=active_regime or "Normal",
        available_models=available_models,
    )

    # Use precipitation weights as primary for blended summary
    blended_result = blend_openmeteo_forecasts(normalized_forecasts, weights_precip)

    # ── Extreme event detection ────────────────────────────────────────────────
    extreme_signals = detect_extreme_events(normalized_forecasts, location_name)

    # ── Build per-model summary for frontend ──────────────────────────────────
    models_summary = {}
    for model_key, fc in normalized_forecasts.items():
        s = fc.get("summary_24h", {})
        models_summary[model_key] = {
            "data_available": fc.get("data_available", False),
            "error": fc.get("error"),
            "forecast_time": fc.get("forecast_time"),
            "retrieved_at": fc.get("retrieved_at"),
            "temperature_mean": s.get("temperature_mean"),
            "temperature_max": s.get("temperature_max"),
            "temperature_min": s.get("temperature_min"),
            "precipitation_total": s.get("precipitation_total"),
            "wind_speed_mean": s.get("wind_speed_mean"),
            "wind_speed_max": s.get("wind_speed_max"),
            "wind_direction_mean": s.get("wind_direction_mean"),
            "humidity_mean": s.get("humidity_mean"),
            "pressure_mean": s.get("pressure_mean"),
            "cloud_cover_mean": s.get("cloud_cover_mean"),
            "cape_max": s.get("cape_max"),
            "precip_prob_max": s.get("precip_prob_max"),
            "hourly_data": fc.get("hourly_data", [])[:24],  # first 24h for charts
        }

    return {
        "location": {
            "name": location_name,
            "latitude": latitude,
            "longitude": longitude,
        },
        "request": {
            "lead_time_hours": lead_time_hours,
            "season": season,
            "weather_regime_detected": active_regime,
            "models_requested": requested_models,
            "models_available": available_models,
            "models_unavailable": [m for m in requested_models if m not in available_models],
        },
        "models": models_summary,
        "weights": {
            "precipitation": weights_precip,
            "temperature": weights_temp,
            "wind_speed": weights_wind,
        },
        "blended_forecast": blended_result,
        "extreme_signals": extreme_signals,
        "data_source": "Open-Meteo (ECMWF IFS, NOAA GFS, DWD ICON)",
        "disclaimer": (
            "Forecast data provided by Open-Meteo.com (CC BY 4.0). "
            "Model weights are heuristic-based estimates, not trained ML outputs. "
            "Extreme signals are decision-support only, NOT official warnings."
        ),
    }


def get_location_forecast(
    city: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    lead_time_hours: int = 24,
    season: str = "Monsoon",
    weather_regime: Optional[str] = None,
    models: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Resolves location from city name or lat/lon, then calls get_multimodel_forecast.
    """
    if city and (latitude is None or longitude is None):
        geo = geocode_city(city)
        if geo is None:
            return {
                "error": f"Could not geocode city: '{city}'. Please provide latitude/longitude directly.",
                "data_available": False,
            }
        latitude = geo["latitude"]
        longitude = geo["longitude"]
        location_name = f"{geo['name']}, {geo.get('admin1', '')} {geo.get('country', '')}".strip(", ")
    elif latitude is not None and longitude is not None:
        location_name = city or f"{latitude:.4f}°N, {longitude:.4f}°E"
    else:
        return {
            "error": "Provide either city name or both latitude and longitude.",
            "data_available": False,
        }

    return get_multimodel_forecast(
        latitude=float(latitude),
        longitude=float(longitude),
        location_name=location_name,
        lead_time_hours=lead_time_hours,
        season=season,
        weather_regime=weather_regime,
        models=models,
    )


def get_historical_data(
    city: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    days_back: int = 7,
) -> Dict[str, Any]:
    """Fetches historical weather data for validation purposes."""
    if city and (latitude is None or longitude is None):
        geo = geocode_city(city)
        if not geo:
            return {"success": False, "error": f"Could not geocode '{city}'"}
        latitude = geo["latitude"]
        longitude = geo["longitude"]

    if latitude is None or longitude is None:
        return {"success": False, "error": "No location specified"}

    return compute_historical_metrics(
        latitude=float(latitude),
        longitude=float(longitude),
        days_back=days_back,
    )
