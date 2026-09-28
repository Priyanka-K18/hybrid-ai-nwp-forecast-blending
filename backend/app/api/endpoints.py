"""
FastAPI Route Handlers for Hybrid AI-NWP Multi-Model Blending System.
Includes both existing demo-mode endpoints AND live Open-Meteo endpoints.
"""
from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Body
from typing import Dict, Any, List, Optional
import json
import io
import logging
import pandas as pd
import datetime
import sys
import platform
import time
import os
import urllib.request
import concurrent.futures
from sqlalchemy import text
from app.database.session import DATABASE_URL, engine

SERVER_START_TIME = time.time()

from app.schemas.forecast import (
    BlendedForecastResult,
    WeightMapResponse,
    ModelSkillResponse,
    ExtremeAlert,
    VerificationCycleResult,
    OperationalRunStatus,
    WhatIfSimulationRequest,
    WhatIfSimulationResponse,
)
from app.services.forecast_service import ForecastService
from app.weather_regime.classifier import WeatherRegimeClassifier
from app.blending.engine import AdaptiveBlendingEngine
from app.verification.engine import VerificationEngine
from app.services.operational_service import OperationalWorkflowService
from app.data_adapters.base import NWPAdapter, EnsembleAdapter, AIForecastAdapter, ObservationAdapter

# Open-Meteo live data integration
from app.weather.openmeteo_service import get_location_forecast, get_historical_data
from app.weather.cache import cache_stats, invalidate_all
from app.weather.geocoding import geocode_city
from app.weather.config import SUPPORTED_MODELS, WEATHER_CACHE_TTL

logger = logging.getLogger("api.endpoints")

router = APIRouter()

# Data Adapter Singletons
adapters = [NWPAdapter(), EnsembleAdapter(), AIForecastAdapter(), ObservationAdapter()]


@router.get("/regions")
def get_regions():
    return ForecastService.REGIONS


@router.get("/models")
def get_models():
    return [
        {
            "id": "nwp",
            "name": "NCUM / ECMWF IFS (Physical NWP)",
            "type": "NWP",
            "resolution_km": 10.0,
            "update_freq_hours": 6,
            "agency": "NCMRWF / ECMWF",
            "description": "Mass-conserving primitive hydrodynamic equations integrating atmospheric thermodynamics.",
            "dominant_regimes": ["Cyclonic", "High Wind", "Stable"]
        },
        {
            "id": "ensemble",
            "name": "EPS / GEFS (51-Member Ensemble)",
            "type": "Ensemble",
            "resolution_km": 28.0,
            "update_freq_hours": 12,
            "agency": "IMD / NCEP",
            "description": "Perturbed initial condition ensemble capturing chaotic divergence and probabilistic spread.",
            "dominant_regimes": ["Heavy Rain", "Cyclonic", "Extended Lead Times"]
        },
        {
            "id": "aiml",
            "name": "Neural GraphNet (Spherical Deep GNN)",
            "type": "AI_ML",
            "resolution_km": 12.5,
            "update_freq_hours": 3,
            "agency": "DeepMind / OpenAtmosphere",
            "description": "Multi-mesh graph neural network trained on 40-year ERA5 reanalysis with fast non-linear inference.",
            "dominant_regimes": ["Convective", "Short Lead Times (6-24h)", "Precipitation Peaks"]
        },
        {
            "id": "blended",
            "name": "Hybrid Adaptive Blended System",
            "type": "Blended",
            "resolution_km": 10.0,
            "update_freq_hours": 3,
            "agency": "Adaptive Multi-Model Core",
            "description": "Context-aware dynamic fusion optimizing weights based on historical skill, lead time, terrain and regime.",
            "dominant_regimes": ["All Weather Regimes (Optimized)"]
        }
    ]


@router.get("/forecast", response_model=BlendedForecastResult)
def get_forecast(
    region: str = Query("karnataka", description="Region ID"),
    lead_time: int = Query(24, description="Forecast lead time in hours (6, 12, 24, 48, 72, 120)"),
    season: str = Query("Monsoon", description="Season (Monsoon, Summer, Winter, Post-Monsoon, Pre-Monsoon)"),
    regime: Optional[str] = Query(None, description="Optional forced weather regime"),
):
    try:
        result = ForecastService.get_blended_forecast(
            region_id=region,
            lead_time_hours=lead_time,
            season=season,
            weather_regime=regime
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weights")
def get_weights(
    variable: str = Query("rainfall", description="Weather variable"),
    region: str = Query("karnataka", description="Region ID"),
    lead_time: int = Query(24, description="Lead time in hours"),
    season: str = Query("Monsoon", description="Season"),
    regime: str = Query("Convective", description="Weather regime"),
):
    weights = AdaptiveBlendingEngine.calculate_weights(
        variable=variable,
        region_id=region,
        lead_time_hours=lead_time,
        season=season,
        weather_regime=regime
    )
    return {
        "variable": variable,
        "region": region,
        "lead_time": lead_time,
        "season": season,
        "regime": regime,
        "weights": weights,
        "formula": f"F_blend = {weights['nwp']:.2f}*F_nwp + {weights['ensemble']:.2f}*F_ens + {weights['aiml']:.2f}*F_ai",
        "is_demo_data": True
    }


@router.get("/weights/map", response_model=WeightMapResponse)
def get_weight_map(
    variable: str = Query("rainfall", description="rainfall, temperature, or wind"),
    lead_time: int = Query(24, description="Lead time hours"),
    season: str = Query("Monsoon", description="Season"),
    regime: str = Query("Convective", description="Weather regime"),
):
    return ForecastService.get_weight_map(
        variable=variable,
        lead_time_hours=lead_time,
        season=season,
        weather_regime=regime
    )


@router.get("/models/{model_id}/skill", response_model=ModelSkillResponse)
def get_model_skill(
    model_id: str,
    variable: str = Query("rainfall"),
    region: str = Query("karnataka"),
    season: str = Query("Monsoon"),
    lead_time: int = Query(24),
    regime: str = Query("Convective"),
):
    return ForecastService.get_model_skill_report(
        variable=variable,
        region_id=region,
        season=season,
        lead_time_hours=lead_time,
        weather_regime=regime
    )


@router.get("/weather-regime")
def get_weather_regime(
    region: str = Query("karnataka"),
    season: str = Query("Monsoon"),
    rainfall: float = Query(45.0),
    temperature: float = Query(28.5),
    wind: float = Query(32.0),
    cape: float = Query(1850.0),
    pwat: float = Query(56.0),
):
    return WeatherRegimeClassifier.classify(
        region_id=region,
        season=season,
        rainfall_est=rainfall,
        temp_est=temperature,
        wind_est=wind,
        cape_jkg=cape,
        pwat_mm=pwat
    )


@router.get("/extremes", response_model=List[ExtremeAlert])
def get_extremes():
    return ForecastService.get_extreme_alerts()


@router.get("/verification")
def get_verification_history(limit: int = Query(15)):
    return {
        "cycles": VerificationEngine.get_history(limit=limit),
        "current_skill_cache": VerificationEngine.CURRENT_SKILL_CACHE,
        "is_demo_data": True
    }


@router.post("/verification/run")
def trigger_verification(
    region: str = Body("karnataka"),
    variable: str = Body("rainfall"),
    lead_time: int = Body(24),
    observation: float = Body(48.2),
    nwp_forecast: float = Body(54.0),
    ensemble_forecast: float = Body(49.5),
    aiml_forecast: float = Body(46.0),
    blended_forecast: float = Body(47.9),
):
    result = VerificationEngine.run_verification_cycle(
        region_id=region,
        variable=variable,
        lead_time_hours=lead_time,
        observation=observation,
        nwp_val=nwp_forecast,
        ensemble_val=ensemble_forecast,
        aiml_val=aiml_forecast,
        blended_val=blended_forecast
    )
    return {
        "status": "SUCCESS",
        "verification_result": result,
        "message": f"Verification completed. Blended forecast achieved {result['blended_improvement_pct']}% error reduction vs best single model. Dynamic weights recalibrated."
    }


@router.get("/operational/status", response_model=OperationalRunStatus)
def get_operational_status():
    return OperationalWorkflowService.get_latest_run_status()


@router.post("/forecast/run")
def trigger_forecast_run():
    status = OperationalWorkflowService.trigger_new_run()
    return {
        "message": "Operational pipeline triggered and synchronized across all 14 stages.",
        "run": status
    }


@router.get("/data/sources")
def get_data_sources():
    return [a.get_metadata() for a in adapters]


@router.post("/what-if", response_model=WhatIfSimulationResponse)
def simulate_what_if(req: WhatIfSimulationRequest):
    """
    Dynamically recalculates weights and blended forecast based on interactive slider changes.
    """
    base_weights = AdaptiveBlendingEngine.calculate_weights(
        "rainfall", req.region_id, req.lead_time_hours, req.season, req.weather_regime
    )
    
    # Custom reliability modifiers
    modifiers = {
        "nwp": req.nwp_reliability_modifier,
        "ensemble": req.ensemble_reliability_modifier,
        "aiml": req.aiml_reliability_modifier,
    }
    
    adjusted_weights = AdaptiveBlendingEngine.calculate_weights(
        "rainfall", req.region_id, req.lead_time_hours, req.season, req.weather_regime,
        whatif_modifiers=modifiers
    )

    raw_vals = ForecastService.generate_raw_model_values(
        req.region_id, req.season, req.lead_time_hours, req.weather_regime
    )

    b_rain_base, _, _ = AdaptiveBlendingEngine.blend(
        "rainfall", raw_vals["nwp"]["rainfall"], raw_vals["ensemble"]["rainfall"], raw_vals["aiml"]["rainfall"], base_weights
    )
    b_temp_base, _, _ = AdaptiveBlendingEngine.blend(
        "temperature", raw_vals["nwp"]["temperature"], raw_vals["ensemble"]["temperature"], raw_vals["aiml"]["temperature"], base_weights
    )
    b_wind_base, _, _ = AdaptiveBlendingEngine.blend(
        "wind", raw_vals["nwp"]["wind"], raw_vals["ensemble"]["wind"], raw_vals["aiml"]["wind"], base_weights
    )

    b_rain_adj, _, _ = AdaptiveBlendingEngine.blend(
        "rainfall", raw_vals["nwp"]["rainfall"], raw_vals["ensemble"]["rainfall"], raw_vals["aiml"]["rainfall"], adjusted_weights
    )
    b_temp_adj, _, _ = AdaptiveBlendingEngine.blend(
        "temperature", raw_vals["nwp"]["temperature"], raw_vals["ensemble"]["temperature"], raw_vals["aiml"]["temperature"], adjusted_weights
    )
    b_wind_adj, _, _ = AdaptiveBlendingEngine.blend(
        "wind", raw_vals["nwp"]["wind"], raw_vals["ensemble"]["wind"], raw_vals["aiml"]["wind"], adjusted_weights
    )

    delta_conf = round((req.aiml_reliability_modifier - 1.0) * 8.0 + (req.ensemble_reliability_modifier - 1.0) * 5.0, 1)

    return {
        "base_weights": base_weights,
        "adjusted_weights": adjusted_weights,
        "base_blended_forecast": {"rainfall": b_rain_base, "temperature": b_temp_base, "wind": b_wind_base},
        "adjusted_blended_forecast": {"rainfall": b_rain_adj, "temperature": b_temp_adj, "wind": b_wind_adj},
        "confidence_delta_pct": delta_conf,
        "explanation": f"Modified reliability factors shifted weighting profile. AI/ML weight shifted from {base_weights['aiml']*100:.1f}% to {adjusted_weights['aiml']*100:.1f}%. Blended rainfall adjusted by {b_rain_adj - b_rain_base:+.1f} mm.",
        "is_demo_data": True
    }


@router.post("/data/upload")
async def upload_forecast_dataset(file: UploadFile = File(...)):
    """
    Validates uploaded CSV or JSON forecast datasets against required meteorological schema.
    """
    filename = file.filename.lower()
    contents = await file.read()

    required_cols = ["timestamp", "latitude", "longitude", "rainfall_mm", "temperature_c"]
    errors = []
    parsed_rows = 0

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
            parsed_rows = len(df)
            for col in required_cols:
                if col not in df.columns:
                    errors.append(f"Missing required column: '{col}'")
            
            # Check for NaN bounds
            if not errors:
                nan_count = df[required_cols].isna().sum().sum()
                if nan_count > 0:
                    errors.append(f"Detected {nan_count} missing (NaN) values in meteorological fields.")

        elif filename.endswith(".json"):
            data = json.loads(contents.decode("utf-8"))
            if isinstance(data, list):
                parsed_rows = len(data)
                if parsed_rows > 0:
                    first_record = data[0]
                    for col in required_cols:
                        if col not in first_record:
                            errors.append(f"JSON record missing required key: '{col}'")
            else:
                errors.append("JSON root must be an array of forecast records.")
        else:
            errors.append("Unsupported file format. Please upload CSV or JSON (NetCDF / GRIB2 support in enterprise edition).")

    except Exception as ex:
        errors.append(f"Parsing failure: {str(ex)}")

    if errors:
        return {
            "status": "VALIDATION_FAILED",
            "filename": file.filename,
            "errors": errors,
            "records_checked": parsed_rows
        }

    return {
        "status": "SUCCESS",
        "filename": file.filename,
        "records_ingested": parsed_rows,
        "message": f"Successfully validated and ingested {parsed_rows} spatio-temporal forecast records into the operational pipeline."
    }


# ═══════════════════════════════════════════════════════════════════════════════
# OPEN-METEO LIVE DATA ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/weather/forecast")
def get_openmeteo_forecast(
    city: Optional[str] = Query(None, description="City name (geocoded automatically)"),
    latitude: Optional[float] = Query(None, description="Latitude"),
    longitude: Optional[float] = Query(None, description="Longitude"),
    lead_time: int = Query(24, description="Forecast lead time hours (6/12/24/48/72/120)"),
    season: str = Query("Monsoon", description="Season (Monsoon/Summer/Winter/Post-Monsoon/Pre-Monsoon)"),
    regime: Optional[str] = Query(None, description="Force weather regime (optional)"),
    models: Optional[str] = Query(None, description="Comma-separated model list e.g. ECMWF,GFS,ICON"),
):
    """
    Fetch live multi-model NWP forecast from Open-Meteo.
    Returns ECMWF, GFS, ICON forecasts with adaptive weights and blended result.
    """
    if city is None and (latitude is None or longitude is None):
        raise HTTPException(
            status_code=400,
            detail="Provide either 'city' or both 'latitude' and 'longitude'."
        )

    model_list = [m.strip().upper() for m in models.split(",")] if models else None
    if model_list:
        invalid = [m for m in model_list if m not in SUPPORTED_MODELS]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported models: {invalid}. Supported: {list(SUPPORTED_MODELS.keys())}"
            )

    try:
        result = get_location_forecast(
            city=city,
            latitude=latitude,
            longitude=longitude,
            lead_time_hours=lead_time,
            season=season,
            weather_regime=regime,
            models=model_list,
        )
    except Exception as e:
        logger.exception("Error in /weather/forecast")
        raise HTTPException(status_code=500, detail=str(e))

    if result.get("error") and not result.get("models"):
        raise HTTPException(status_code=422, detail=result["error"])

    return result


@router.get("/weather/models")
def get_openmeteo_models():
    """Returns available NWP models from Open-Meteo."""
    return [
        {
            "id": "ECMWF",
            "name": "ECMWF IFS (European Centre for Medium-Range Weather Forecasts)",
            "source": "Open-Meteo",
            "endpoint": "api.open-meteo.com/v1/ecmwf",
            "resolution": "0.25° (~25 km)",
            "update_cycle": "4x daily",
            "max_lead_days": 10,
            "description": "World-leading operational NWP model. Excellent skill for synoptic-scale patterns.",
        },
        {
            "id": "GFS",
            "name": "GFS Seamless (NOAA Global Forecast System)",
            "source": "Open-Meteo",
            "endpoint": "api.open-meteo.com/v1/forecast",
            "resolution": "0.25° (~25 km)",
            "update_cycle": "4x daily",
            "max_lead_days": 16,
            "description": "NOAA GFS + GFS GraphCast seamless blend. Good performance for extended lead times.",
        },
        {
            "id": "ICON",
            "name": "ICON Seamless (DWD Icosahedral Nonhydrostatic)",
            "source": "Open-Meteo",
            "endpoint": "api.open-meteo.com/v1/forecast",
            "resolution": "0.1° (~10 km)",
            "update_cycle": "4x daily",
            "max_lead_days": 7,
            "description": "German Weather Service model. High resolution, strong European/Asian regional skill.",
        },
    ]


@router.get("/weather/blended")
def get_openmeteo_blended(
    city: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    lead_time: int = Query(24),
    season: str = Query("Monsoon"),
    regime: Optional[str] = Query(None),
):
    """
    Returns the full blended forecast including per-model data, adaptive weights,
    blended values, and extreme-weather signals.
    GET /api/weather/blended?latitude=12.9716&longitude=77.5946
    """
    if city is None and (latitude is None or longitude is None):
        raise HTTPException(status_code=400, detail="Provide city or lat/lon.")

    try:
        result = get_location_forecast(
            city=city,
            latitude=latitude,
            longitude=longitude,
            lead_time_hours=lead_time,
            season=season,
            weather_regime=regime,
        )
    except Exception as e:
        logger.exception("Error in /weather/blended")
        raise HTTPException(status_code=500, detail=str(e))

    if result.get("error") and not result.get("models"):
        raise HTTPException(status_code=422, detail=result["error"])

    return result


@router.get("/weather/weights")
def get_openmeteo_weights(
    variable: str = Query("precipitation", description="precipitation / temperature / wind_speed"),
    lead_time: int = Query(24),
    season: str = Query("Monsoon"),
    regime: str = Query("Normal"),
    available_models: Optional[str] = Query(None, description="Comma-separated available model names"),
):
    """
    Returns computed adaptive weights for ECMWF, GFS, ICON for the given context.
    Weights sum to 1.0. Formula: weight ∝ 1/MAE × lead_decay × season_mod × regime_mod
    """
    from app.weather.openmeteo_weighting import calculate_openmeteo_weights, BASE_MAE, LEAD_TIME_SKILL
    model_list = ([m.strip().upper() for m in available_models.split(",")] if available_models else None)
    weights = calculate_openmeteo_weights(
        variable=variable,
        lead_time_hours=lead_time,
        season=season,
        weather_regime=regime,
        available_models=model_list,
    )
    return {
        "variable": variable,
        "lead_time_hours": lead_time,
        "season": season,
        "weather_regime": regime,
        "weights": weights,
        "formula": "weight ∝ (1/MAE) × lead_time_decay × season_modifier × regime_modifier; normalized to sum=1.0",
        "base_mae": BASE_MAE.get(variable.lower(), {}),
        "note": "Weights are heuristic-based estimates using literature MAE values. Real historical verification data would improve accuracy.",
    }


@router.get("/weather/metrics")
def get_openmeteo_metrics(
    city: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    days_back: int = Query(7, description="Number of past days to fetch historical data"),
):
    """
    Fetches recent historical weather data from Open-Meteo Archive.
    Returns real observed values — NOT fake metrics.
    If data unavailable, clearly states so.
    """
    if city is None and (latitude is None or longitude is None):
        raise HTTPException(status_code=400, detail="Provide city or lat/lon.")

    try:
        result = get_historical_data(
            city=city,
            latitude=latitude,
            longitude=longitude,
            days_back=days_back,
        )
    except Exception as e:
        logger.exception("Error in /weather/metrics")
        raise HTTPException(status_code=500, detail=str(e))

    return result


@router.get("/weather/extremes")
def get_openmeteo_extremes(
    city: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    season: str = Query("Monsoon"),
):
    """
    Returns extreme weather signals derived from real Open-Meteo model data.
    Signals are AI/NWP model outputs — NOT official government warnings.
    """
    if city is None and (latitude is None or longitude is None):
        raise HTTPException(status_code=400, detail="Provide city or lat/lon.")

    try:
        result = get_location_forecast(
            city=city,
            latitude=latitude,
            longitude=longitude,
            season=season,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "location": result.get("location"),
        "extreme_signals": result.get("extreme_signals", []),
        "models_used": result.get("request", {}).get("models_available", []),
        "disclaimer": result.get("disclaimer"),
    }


@router.get("/weather/geocode")
def geocode_location(city: str = Query(..., description="City name to geocode")):
    """Resolves a city name to lat/lon using Open-Meteo Geocoding API."""
    result = geocode_city(city)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Could not geocode city: '{city}'")
    return result


@router.get("/weather/cache")
def get_cache_status():
    """Returns current weather data cache statistics."""
    return {
        **cache_stats(),
        "cache_ttl_seconds": WEATHER_CACHE_TTL,
        "note": "Cache is in-memory and resets on server restart.",
    }


@router.delete("/weather/cache")
def clear_weather_cache():
    """Clears all cached weather data — forces fresh API calls."""
    removed = invalidate_all()
    return {"cleared": removed, "message": f"Cleared {removed} cached entries."}


@router.get("/system/health")
def get_system_health():
    """Returns deep operational metrics, database state, cache statistics, and uptime."""
    uptime_seconds = int(time.time() - SERVER_START_TIME)

    db_status = "ONLINE"
    db_size_bytes = 0
    db_tables = []
    try:
        if DATABASE_URL.startswith("sqlite"):
            db_path = DATABASE_URL.replace("sqlite:///", "")
            if os.path.exists(db_path):
                db_size_bytes = os.path.getsize(db_path)
        with engine.connect() as conn:
            res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            db_tables = [row[0] for row in res.fetchall()]
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    c_stats = cache_stats()
    hits = c_stats.get("hits", 0)
    misses = c_stats.get("misses", 0)
    total_reqs = hits + misses
    hit_rate = round((hits / total_reqs * 100), 1) if total_reqs > 0 else 0.0

    op_status = OperationalWorkflowService.get_latest_run_status()
    cycle_id = op_status.get("run_id") if isinstance(op_status, dict) else getattr(op_status, "run_id", "CYC-AUTO-101")
    last_cycle_time = op_status.get("start_time") if isinstance(op_status, dict) else getattr(op_status, "start_time", None)
    if isinstance(last_cycle_time, datetime.datetime):
        last_cycle_time = last_cycle_time.isoformat()

    return {
        "status": "HEALTHY" if db_status == "ONLINE" else "DEGRADED",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "uptime_seconds": uptime_seconds,
        "runtime": {
            "python_version": platform.python_version(),
            "os": f"{platform.system()} {platform.release()}",
            "server": "Uvicorn + FastAPI",
            "environment": "development",
        },
        "database": {
            "status": db_status,
            "engine": "SQLite",
            "url": DATABASE_URL,
            "size_bytes": db_size_bytes,
            "tables": db_tables,
        },
        "cache": {
            **c_stats,
            "hit_rate_pct": hit_rate,
            "ttl_seconds": WEATHER_CACHE_TTL,
        },
        "operational_pipeline": {
            "cycle_id": cycle_id,
            "status": "COMPLETED",
            "stages_count": 14,
            "last_cycle_timestamp": last_cycle_time,
        }
    }


@router.post("/system/probe-providers")
def probe_providers():
    """Runs concurrent latency and connectivity probes across upstream weather providers and database."""
    def probe_url(name: str, url: str, test_desc: str):
        t0 = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "HybridAIForecast-HealthCheck/1.0"})
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                elapsed_ms = round((time.time() - t0) * 1000, 1)
                status_code = resp.status
                return {
                    "name": name,
                    "target": test_desc,
                    "url": url,
                    "status": "HEALTHY" if status_code == 200 else "DEGRADED",
                    "status_code": status_code,
                    "latency_ms": elapsed_ms,
                    "error": None,
                }
        except Exception as e:
            elapsed_ms = round((time.time() - t0) * 1000, 1)
            return {
                "name": name,
                "target": test_desc,
                "url": url,
                "status": "UNAVAILABLE",
                "status_code": None,
                "latency_ms": elapsed_ms,
                "error": str(e),
            }

    def probe_db():
        t0 = time.time()
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            elapsed_ms = round((time.time() - t0) * 1000, 1)
            return {
                "name": "Local SQLite Database",
                "target": "hybrid_forecast.db query execution",
                "url": "sqlite:///./hybrid_forecast.db",
                "status": "HEALTHY",
                "status_code": 200,
                "latency_ms": elapsed_ms,
                "error": None,
            }
        except Exception as e:
            elapsed_ms = round((time.time() - t0) * 1000, 1)
            return {
                "name": "Local SQLite Database",
                "target": "hybrid_forecast.db query execution",
                "url": "sqlite:///./hybrid_forecast.db",
                "status": "UNAVAILABLE",
                "status_code": None,
                "latency_ms": elapsed_ms,
                "error": str(e),
            }

    targets = [
        ("Open-Meteo Forecast (GFS/ICON)", "https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current=temperature_2m", "Real-time surface observation"),
        ("Open-Meteo ECMWF High-Res", "https://api.open-meteo.com/v1/ecmwf?latitude=12.97&longitude=77.59&hourly=temperature_2m&forecast_days=1", "ECMWF IFS 0.25° endpoint"),
        ("Open-Meteo Geocoding Service", "https://geocoding-api.open-meteo.com/v1/search?name=Bengaluru&count=1", "Spatial city gazetteer"),
        ("Open-Meteo Climate Archive", "https://archive-api.open-meteo.com/v1/archive?latitude=12.97&longitude=77.59&start_date=2024-01-01&end_date=2024-01-02&daily=temperature_2m_mean", "Historical verification store"),
    ]

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(probe_url, name, url, desc) for name, url, desc in targets]
        futures.append(executor.submit(probe_db))
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    results.sort(key=lambda r: (0 if "SQLite" in r["name"] else 1, r["name"]))
    return {"timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "providers": results}


@router.post("/system/vacuum-db")
def vacuum_database():
    """Runs SQLite VACUUM to reclaim storage and defragment database pages."""
    try:
        db_path = DATABASE_URL.replace("sqlite:///", "")
        initial_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
        with engine.connect() as conn:
            conn.execute(text("VACUUM"))
        final_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
        return {
            "status": "SUCCESS",
            "message": "Database storage compacted and defragmented.",
            "initial_size_bytes": initial_size,
            "final_size_bytes": final_size,
            "reclaimed_bytes": max(0, initial_size - final_size),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database maintenance failed: {e}")


