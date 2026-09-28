# Hybrid AI–NWP Multi-Model Forecast Blending System

A production-grade meteorological decision-support system that dynamically combines multiple Numerical Weather Prediction (NWP) and AI weather models rather than relying on a single forecast source.

The system integrates **Open-Meteo** as the primary live weather acquisition layer, acquiring live feeds from **ECMWF IFS (0.25°)**, **GFS Seamless (NOAA)**, and **ICON Seamless (DWD)** without requiring an API key.

---

## 🌟 Key Features

1. **Multi-Model Parallel Acquisition**
   - Fetches ECMWF, GFS, and ICON forecasts concurrently via `concurrent.futures`.
   - Built with standard library `urllib`, avoiding unnecessary external dependencies.
   - Built-in retry logic, timeout handling, and graceful degradation when upstream providers fail.

2. **In-Memory TTL Caching**
   - Keys: `(round(lat, 4), round(lon, 4), model)`.
   - Default TTL: 3600 seconds (1 hour), fully configurable via `WEATHER_CACHE_TTL`.
   - Tracks cache hits, misses, active entries, and stale entries.
   - Cache status and manual invalidation exposed via API and UI.

3. **Canonical Normalization Layer**
   - Unified schema for all models:
     - 24-hour meteorological summaries (`temperature_mean`, `precipitation_total`, `wind_speed_mean`, `cape_max`, etc.).
     - Hourly time series (temperature, precipitation, wind speed/direction, pressure, humidity, cloud cover, CAPE, visibility, precipitation probability).
   - "No fake data" guarantee: Returns `data_available: false` with explicit error descriptions if an upstream model is unavailable.

4. **Dynamic Contextual Weighting Engine**
   - Adaptive weights computed via inverse Mean Absolute Error (MAE):
     $$\text{reliability} = \frac{1}{\text{MAE} + \epsilon}$$
   - Climatological season modifiers (Monsoon, Summer, Winter, Pre-Monsoon, Post-Monsoon).
   - Atmospheric regime modifiers (Convective, Heavy Rain, Heat Wave, High Wind, Cyclonic, Stable, Cold/Dry, Normal).
   - Lead-time skill decay multipliers (6h to 120h).
   - Weights always strictly renormalize to $1.0$. If a model fails, the remaining models are dynamically renormalized without disruption.

5. **Extreme Weather Detection with Multi-Model Agreement**
   - Evaluates multi-model consensus for heavy precipitation, extreme heat/cold, severe wind storms, and convective instability.
   - Reports model agreement ratio (e.g. $2/3$ models) and confidence level.
   - **Mandatory Disclaimer**: All signals clearly state:
     > *"AI/NWP Risk Signal only. NOT an official government or IMD meteorological warning. Do not use as sole basis for emergency decisions."*

6. **Interactive Live Weather Frontend**
   - Dedicated `/live-weather` dashboard with:
     - City geocoding (Open-Meteo Geocoding API) and direct latitude/longitude input.
     - Blended meteorological KPI cards.
     - Per-model comparison cards showing individual model forecasts side-by-side.
     - Weight distribution progress bars.
     - Multi-model Recharts comparisons and 24-hour timeline charts.
     - Risk signal alerts with consensus levels.
   - Cache control and health monitoring integrated into `/settings`.

---

## 🏗 System Architecture

```
[ Open-Meteo Public APIs ]
      │  (ECMWF IFS, GFS, ICON, Geocoding, Archive)
      ▼
┌─────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                       │
│  app/weather/                                               │
│   ├── providers/openmeteo.py     ── Parallel HTTP fetcher   │
│   ├── cache.py                   ── In-memory TTL cache     │
│   ├── normalization/             ── Canonical schema parse  │
│   ├── openmeteo_weighting.py     ── Inverse-MAE weighting   │
│   ├── extreme_detector.py        ── Multi-model consensus   │
│   ├── historical.py              ── Archive API metrics     │
│   └── openmeteo_service.py       ── Orchestration layer     │
└─────────────────────────────────────────────────────────────┘
      │
      │ REST API (/api/weather/*)
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    React 19 + Vite Frontend                 │
│   ├── src/pages/LiveWeatherForecast.tsx  ── Live Dashboard │
│   ├── src/pages/SettingsHealth.tsx       ── Cache monitor   │
│   ├── src/services/api.ts                ── API client      │
│   └── src/components/Sidebar.tsx         ── Navigation      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 API Reference (`/api/weather/*`)

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| `GET` | `/api/weather/models` | List supported NWP models and metadata | None |
| `GET` | `/api/weather/geocode` | Resolve city name to lat/lon | `city` (string) |
| `GET` | `/api/weather/forecast` | Raw normalized forecasts per model | `city` or `latitude`, `longitude`, `lead_time`, `season`, `regime`, `models` |
| `GET` | `/api/weather/blended` | Complete blended forecast + extremes | `city` or `latitude`, `longitude`, `lead_time`, `season`, `regime` |
| `GET` | `/api/weather/weights` | Get computed adaptive weights | `variable`, `lead_time`, `season`, `regime`, `available_models` |
| `GET` | `/api/weather/metrics` | Historical archive data for verification | `city` or `latitude`, `longitude`, `days_back` |
| `GET` | `/api/weather/extremes` | Evaluate extreme event signals | `city` or `latitude`, `longitude`, `season` |
| `GET` | `/api/weather/cache` | Get in-memory cache statistics | None |
| `DELETE` | `/api/weather/cache` | Invalidate all cached weather entries | None |

---

## ⚙️ Configuration & Environment Variables

All configuration is centralized in `backend/app/weather/config.py` and can be overridden via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENMETEO_BASE_URL` | `https://api.open-meteo.com` | Base URL for Open-Meteo Forecast APIs |
| `OPENMETEO_HISTORICAL_URL` | `https://archive-api.open-meteo.com` | Base URL for Historical Weather Archive |
| `OPENMETEO_GEOCODING_URL` | `https://geocoding-api.open-meteo.com/v1/search` | Geocoding API endpoint |
| `WEATHER_CACHE_TTL` | `3600` | In-memory cache lifetime in seconds (1 hour) |
| `OPENMETEO_TIMEOUT_SECONDS` | `10` | HTTP request timeout |
| `FORECAST_SUMMARY_HOURS` | `24` | Forecast horizon used for summary metrics |

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/macOS
# source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at `http://127.0.0.1:8000`. Swagger documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start at `http://localhost:5173/`. All `/api/*` calls are automatically proxied to the backend on port 8000.

---

## 🧪 Running Tests

A unit and integration test suite is located in `backend/tests/test_openmeteo.py`. It runs using Python's standard `unittest` framework:

```bash
cd backend
venv\Scripts\python -m unittest tests/test_openmeteo.py -v
```

The test suite validates:
- Normalization of raw Open-Meteo responses into canonical dicts.
- In-memory cache set, get, TTL invalidation, hits, and misses.
- Adaptive weight calculations and graceful weight renormalization on missing models.
- Extreme weather event detection and consensus thresholds.
- Multi-model forecast blending calculations.
- Geocoding parsing and location resolution.

---

## 🔌 How to Add a New NWP / AI Model

To add another model (e.g. GraphCast, GEM, or UKMO):

1. **Register the model in `backend/app/weather/config.py`**:
   ```python
   SUPPORTED_MODELS["UKMO"] = "ukmo_global"
   ```
2. **Add baseline MAE values in `backend/app/weather/openmeteo_weighting.py`**:
   ```python
   BASE_MAE["temperature"]["UKMO"] = 1.1
   BASE_MAE["precipitation"]["UKMO"] = 6.0
   BASE_MAE["wind_speed"]["UKMO"] = 4.6
   ```
3. **Add model color and metadata in frontend**:
   - `frontend/src/pages/LiveWeatherForecast.tsx`:
     ```ts
     const MODEL_COLORS: Record<string, string> = {
       ECMWF: '#6366f1',
       GFS:   '#22d3ee',
       ICON:  '#f59e0b',
       UKMO:  '#10b981',
     };
     ```
4. Done! The service automatically coordinates parallel fetching, caching, normalization, weighting, and blending for the new model.
