"""
Adaptive Weighting Engine for Open-Meteo NWP Models.
Computes inverse-error-based weights for ECMWF, GFS, ICON.
Weights depend on: historical MAE (when available), lead time, season, weather regime.
sum(weights) is always guaranteed = 1.0

IMPORTANT: These weights are based on published/estimated model skill and
context heuristics. They are NOT from a trained ML model unless explicitly stated.
"""
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger("weather.openmeteo_weighting")

# ── Baseline MAE estimates for ECMWF / GFS / ICON ───────────────────────────
# Source: Literature-based estimates. Real historical verification would
# update these via the VerificationEngine's CURRENT_SKILL_CACHE.
# precipitation in mm, temperature in °C, wind_speed in km/h
BASE_MAE: Dict[str, Dict[str, float]] = {
    "temperature": {"ECMWF": 1.0, "GFS": 1.3, "ICON": 1.15},
    "precipitation": {"ECMWF": 5.8, "GFS": 6.5, "ICON": 6.1},
    "wind_speed": {"ECMWF": 4.5, "GFS": 5.2, "ICON": 4.8},
}

EPSILON = 0.05  # prevent division by zero

# ── Lead-time skill decay ────────────────────────────────────────────────────
# Each value is a multiplier on raw reliability.
# Lower value = less reliable at that lead time.
LEAD_TIME_SKILL: Dict[str, Dict[int, float]] = {
    "ECMWF":  {6: 1.20, 12: 1.15, 24: 1.10, 48: 1.05, 72: 0.95, 120: 0.85},
    "GFS":    {6: 1.05, 12: 1.02, 24: 1.00, 48: 0.98, 72: 0.95, 120: 0.90},
    "ICON":   {6: 1.15, 12: 1.10, 24: 1.05, 48: 0.98, 72: 0.92, 120: 0.85},
}

# ── Season modifiers ──────────────────────────────────────────────────────────
SEASON_MODIFIERS: Dict[str, Dict[str, float]] = {
    "Monsoon":      {"ECMWF": 1.05, "GFS": 0.95, "ICON": 1.00},
    "Summer":       {"ECMWF": 1.00, "GFS": 1.05, "ICON": 1.00},
    "Winter":       {"ECMWF": 1.05, "GFS": 1.00, "ICON": 1.05},
    "Post-Monsoon": {"ECMWF": 1.02, "GFS": 1.00, "ICON": 1.02},
    "Pre-Monsoon":  {"ECMWF": 1.02, "GFS": 0.98, "ICON": 1.00},
}

# ── Weather regime modifiers ─────────────────────────────────────────────────
REGIME_MODIFIERS: Dict[str, Dict[str, float]] = {
    "Convective":  {"ECMWF": 1.00, "GFS": 0.95, "ICON": 1.05},
    "Heavy Rain":  {"ECMWF": 1.05, "GFS": 0.95, "ICON": 1.00},
    "Heat Wave":   {"ECMWF": 1.05, "GFS": 1.00, "ICON": 0.98},
    "High Wind":   {"ECMWF": 1.10, "GFS": 0.95, "ICON": 1.00},
    "Cyclonic":    {"ECMWF": 1.15, "GFS": 0.90, "ICON": 0.95},
    "Stable":      {"ECMWF": 1.00, "GFS": 1.00, "ICON": 1.00},
    "Cold / Dry":  {"ECMWF": 1.05, "GFS": 1.00, "ICON": 1.05},
    "Normal":      {"ECMWF": 1.00, "GFS": 1.00, "ICON": 1.00},
}


def _closest_lead_key(lead_hours: int, table: Dict[int, float]) -> float:
    keys = sorted(table.keys())
    closest = min(keys, key=lambda x: abs(x - lead_hours))
    return table[closest]


def calculate_openmeteo_weights(
    variable: str = "precipitation",
    lead_time_hours: int = 24,
    season: str = "Monsoon",
    weather_regime: str = "Normal",
    available_models: Optional[list] = None,
    skill_overrides: Optional[Dict[str, float]] = None,
) -> Dict[str, float]:
    """
    Returns normalized weights for ECMWF, GFS, ICON summing to 1.0.
    Unavailable models are excluded and remaining weights are renormalized.

    Args:
        variable: 'precipitation', 'temperature', or 'wind_speed'
        lead_time_hours: forecast lead time (6, 12, 24, 48, 72, 120)
        season: climatological season string
        weather_regime: detected or forced weather regime
        available_models: list of model names that returned data (e.g. ['ECMWF', 'GFS'])
        skill_overrides: optional dict of { model_name: mae } to override BASE_MAE
    """
    var_key = variable.lower()
    if var_key not in BASE_MAE:
        var_key = "precipitation"

    models_to_use = available_models or list(BASE_MAE[var_key].keys())
    if not models_to_use:
        return {}

    season_mod   = SEASON_MODIFIERS.get(season, {"ECMWF": 1.0, "GFS": 1.0, "ICON": 1.0})
    regime_mod   = REGIME_MODIFIERS.get(weather_regime, {"ECMWF": 1.0, "GFS": 1.0, "ICON": 1.0})

    raw_scores: Dict[str, float] = {}
    for model in models_to_use:
        # Base reliability from MAE
        mae = BASE_MAE[var_key].get(model, 6.0)
        if skill_overrides and model in skill_overrides:
            mae = skill_overrides[model]
        reliability = 1.0 / (mae + EPSILON)

        # Lead-time decay
        lead_factor = _closest_lead_key(lead_time_hours, LEAD_TIME_SKILL.get(model, {24: 1.0}))

        # Context multipliers
        s_mod = season_mod.get(model, 1.0)
        r_mod = regime_mod.get(model, 1.0)

        score = reliability * lead_factor * s_mod * r_mod
        raw_scores[model] = max(0.001, score)

    total = sum(raw_scores.values())
    weights = {m: round(v / total, 4) for m, v in raw_scores.items()}

    # Guarantee exact sum = 1.0 by adjusting the highest-weight model
    diff = round(1.0 - sum(weights.values()), 4)
    if weights and diff != 0:
        top_model = max(weights, key=weights.get)
        weights[top_model] = round(weights[top_model] + diff, 4)

    logger.debug("OpenMeteo weights [%s, %dh, %s, %s]: %s",
                 variable, lead_time_hours, season, weather_regime, weights)
    return weights


def blend_openmeteo_forecasts(
    normalized_forecasts: Dict[str, Dict[str, Any]],
    weights: Dict[str, float],
) -> Dict[str, Any]:
    """
    Blends normalized forecasts using provided weights.
    Only uses models present in both normalized_forecasts and weights.
    Returns blended summary_24h values plus model disagreement info.
    """
    available = {
        m: fc for m, fc in normalized_forecasts.items()
        if fc.get("data_available", False) and m in weights
    }

    if not available:
        return {
            "data_available": False,
            "error": "No model data available for blending",
            "blended_summary": {},
            "model_agreement": {},
            "weights_used": {},
        }

    # Renormalize weights for actually-available models
    active_weights_raw = {m: weights[m] for m in available}
    total = sum(active_weights_raw.values())
    active_weights = {m: round(v / total, 4) for m, v in active_weights_raw.items()}

    keys_to_blend = [
        "temperature_mean", "temperature_max", "temperature_min",
        "precipitation_total", "wind_speed_mean", "wind_speed_max",
        "wind_direction_mean", "humidity_mean", "pressure_mean",
        "cloud_cover_mean", "cape_max", "precip_prob_max",
    ]

    blended_summary: Dict[str, Optional[float]] = {}
    disagreement: Dict[str, Any] = {}

    for key in keys_to_blend:
        vals = {}
        for model, fc in available.items():
            v = fc.get("summary_24h", {}).get(key)
            if v is not None:
                vals[model] = v

        if not vals:
            blended_summary[key] = None
            continue

        # Weighted blend using only models with data for this key
        models_with_data = list(vals.keys())
        sub_raw = {m: active_weights.get(m, 0.0) for m in models_with_data}
        sub_total = sum(sub_raw.values())
        if sub_total == 0:
            blended_summary[key] = None
            continue
        sub_weights = {m: v / sub_total for m, v in sub_raw.items()}

        blended_val = sum(vals[m] * sub_weights[m] for m in models_with_data)

        if key in ("precipitation_total",):
            blended_summary[key] = round(max(0.0, blended_val), 2)
        else:
            blended_summary[key] = round(blended_val, 2)

        # Disagreement (range / mean)
        model_vals = list(vals.values())
        if len(model_vals) > 1:
            spread = max(model_vals) - min(model_vals)
            mean_v = sum(model_vals) / len(model_vals)
            disagree_pct = round((spread / max(abs(mean_v), 1e-3)) * 100, 1)
        else:
            disagree_pct = 0.0
        disagreement[key] = {
            "model_values": vals,
            "spread": round(max(model_vals) - min(model_vals), 2) if len(model_vals) > 1 else 0.0,
            "disagreement_pct": disagree_pct,
        }

    # Overall confidence from precipitation disagreement
    precip_disagree = disagreement.get("precipitation_total", {}).get("disagreement_pct", 0.0)
    confidence = round(max(30.0, min(95.0, 95.0 - precip_disagree * 0.5)), 1)

    return {
        "data_available": True,
        "error": None,
        "blended_summary": blended_summary,
        "model_agreement": disagreement,
        "weights_used": active_weights,
        "models_used": list(available.keys()),
        "models_unavailable": [m for m in normalized_forecasts if not normalized_forecasts[m].get("data_available")],
        "blending_confidence_pct": confidence,
    }
