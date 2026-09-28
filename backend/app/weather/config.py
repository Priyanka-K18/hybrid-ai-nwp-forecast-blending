"""
Open-Meteo Integration Configuration.
All configurable thresholds and URLs live here — never hard-coded across the app.
"""
import os

# ─── Open-Meteo API Endpoints ─────────────────────────────────────────────────
OPENMETEO_BASE_URL = os.environ.get(
    "OPENMETEO_BASE_URL", "https://api.open-meteo.com/v1/forecast"
)
OPENMETEO_ECMWF_URL = os.environ.get(
    "OPENMETEO_ECMWF_URL", "https://api.open-meteo.com/v1/ecmwf"
)
OPENMETEO_HISTORICAL_URL = os.environ.get(
    "OPENMETEO_HISTORICAL_URL", "https://archive-api.open-meteo.com/v1/archive"
)
OPENMETEO_GEOCODING_URL = os.environ.get(
    "OPENMETEO_GEOCODING_URL", "https://geocoding-api.open-meteo.com/v1/search"
)

# ─── Cache ────────────────────────────────────────────────────────────────────
# How long (seconds) a location+model forecast response is cached before a fresh call.
WEATHER_CACHE_TTL: int = int(os.environ.get("WEATHER_CACHE_TTL", "3600"))  # 1 hour default

# ─── Request Timeouts ─────────────────────────────────────────────────────────
OPENMETEO_TIMEOUT_SECONDS: int = int(os.environ.get("OPENMETEO_TIMEOUT", "15"))

# ─── Supported NWP Models ─────────────────────────────────────────────────────
# Maps internal model key → Open-Meteo model_id query param
SUPPORTED_MODELS = {
    "ECMWF": "ecmwf_ifs025",       # ECMWF IFS 0.25°
    "GFS":   "gfs_seamless",       # NOAA GFS seamless (GFS + GFS GraphCast)
    "ICON":  "icon_seamless",      # DWD ICON seamless
}

# Secondary ECMWF endpoint model key
ECMWF_ENDPOINT_MODEL = "ecmwf_ifs025"

# ─── Standard Variables to Fetch ──────────────────────────────────────────────
HOURLY_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "wind_speed_10m",
    "wind_direction_10m",
    "surface_pressure",
    "cloud_cover",
    "precipitation_probability",
    "weather_code",
    "cape",
    "visibility",
]

# Variables that not all models support (fetched best-effort)
OPTIONAL_VARIABLES = [
    "cape",
    "visibility",
    "precipitation_probability",
]

# ─── Extreme-Weather Thresholds (all configurable) ────────────────────────────
RAINFALL_THRESHOLD_HEAVY_RAIN: float = float(
    os.environ.get("RAINFALL_THRESHOLD_HEAVY_RAIN", "35.0")
)  # mm/24h
RAINFALL_THRESHOLD_EXTREME_RAIN: float = float(
    os.environ.get("RAINFALL_THRESHOLD_EXTREME_RAIN", "70.0")
)  # mm/24h
TEMP_THRESHOLD_HEAT: float = float(
    os.environ.get("TEMP_THRESHOLD_HEAT", "40.0")
)  # °C
TEMP_THRESHOLD_EXTREME_HEAT: float = float(
    os.environ.get("TEMP_THRESHOLD_EXTREME_HEAT", "45.0")
)  # °C
WIND_THRESHOLD_HIGH: float = float(
    os.environ.get("WIND_THRESHOLD_HIGH", "50.0")
)  # km/h
WIND_THRESHOLD_STORM: float = float(
    os.environ.get("WIND_THRESHOLD_STORM", "72.0")
)  # km/h
CAPE_THRESHOLD_CONVECTIVE: float = float(
    os.environ.get("CAPE_THRESHOLD_CONVECTIVE", "1000.0")
)  # J/kg
CAPE_THRESHOLD_SEVERE: float = float(
    os.environ.get("CAPE_THRESHOLD_SEVERE", "2500.0")
)  # J/kg
PRECIP_PROB_THRESHOLD: float = float(
    os.environ.get("PRECIP_PROB_THRESHOLD", "70.0")
)  # %

# ─── Forecast Lead Time for 24h Summary ───────────────────────────────────────
FORECAST_SUMMARY_HOURS: int = 24   # aggregate over first N forecast hours
