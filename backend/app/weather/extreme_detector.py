"""
Extreme Weather Detection Module.
Analyzes normalized forecast data and returns structured risk signals.
All thresholds come from config.py — not hard-coded here.

IMPORTANT: These are model/system signals, NOT official government warnings.
All outputs carry a mandatory disclaimer.
"""
from typing import List, Dict, Any, Optional

from app.weather.config import (
    RAINFALL_THRESHOLD_HEAVY_RAIN,
    RAINFALL_THRESHOLD_EXTREME_RAIN,
    TEMP_THRESHOLD_HEAT,
    TEMP_THRESHOLD_EXTREME_HEAT,
    WIND_THRESHOLD_HIGH,
    WIND_THRESHOLD_STORM,
    CAPE_THRESHOLD_CONVECTIVE,
    CAPE_THRESHOLD_SEVERE,
    PRECIP_PROB_THRESHOLD,
)

DISCLAIMER = (
    "AI/NWP Risk Signal only. NOT an official government or IMD meteorological warning. "
    "Do not use as sole basis for emergency decisions."
)


def detect_extreme_events(
    normalized_forecasts: Dict[str, Dict[str, Any]],
    location_name: str,
) -> List[Dict[str, Any]]:
    """
    Analyzes a dict of { model_name: normalized_forecast } and returns
    a list of extreme-weather signal dicts.

    Each signal:
    {
      "event": str,
      "severity": "Low" | "Moderate" | "High" | "Extreme",
      "confidence": float (0..1) — based on model agreement fraction,
      "model_agreement": int  (number of models agreeing),
      "total_models": int,
      "metric_details": str,
      "location": str,
      "disclaimer": str,
      "data_available": bool
    }
    """
    events: List[Dict[str, Any]] = []
    available_models = {
        name: fc for name, fc in normalized_forecasts.items()
        if fc.get("data_available", False)
    }
    total = len(normalized_forecasts)
    available = len(available_models)

    if not available_models:
        return [{
            "event": "Data Unavailable",
            "severity": "Unknown",
            "confidence": 0.0,
            "model_agreement": 0,
            "total_models": total,
            "metric_details": "No model data available to assess extreme weather.",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": False,
        }]

    # ── Helper: count how many models breach threshold ──────────────────────
    def _count_breach(metric_key: str, threshold: float, greater: bool = True) -> int:
        count = 0
        for fc in available_models.values():
            s = fc.get("summary_24h", {})
            val = s.get(metric_key)
            if val is not None:
                if greater and val >= threshold:
                    count += 1
                elif not greater and val <= threshold:
                    count += 1
        return count

    def _max_across_models(metric_key: str) -> Optional[float]:
        vals = []
        for fc in available_models.values():
            s = fc.get("summary_24h", {})
            v = s.get(metric_key)
            if v is not None:
                vals.append(v)
        return max(vals) if vals else None

    def _mean_across_models(metric_key: str) -> Optional[float]:
        vals = []
        for fc in available_models.values():
            s = fc.get("summary_24h", {})
            v = s.get(metric_key)
            if v is not None:
                vals.append(v)
        if not vals:
            return None
        return round(sum(vals) / len(vals), 2)

    # ── 1. Extreme Rain ─────────────────────────────────────────────────────
    rain_breach_extreme = _count_breach("precipitation_total", RAINFALL_THRESHOLD_EXTREME_RAIN)
    rain_breach_heavy   = _count_breach("precipitation_total", RAINFALL_THRESHOLD_HEAVY_RAIN)
    max_rain = _max_across_models("precipitation_total")

    if rain_breach_extreme > 0:
        conf = rain_breach_extreme / available
        events.append({
            "event": "Extreme Rainfall",
            "severity": "Extreme" if conf >= 0.67 else "High",
            "confidence": round(conf, 2),
            "model_agreement": rain_breach_extreme,
            "total_models": available,
            "metric_details": f"Max 24h rainfall across models: {max_rain:.1f} mm (threshold: {RAINFALL_THRESHOLD_EXTREME_RAIN} mm)",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })
    elif rain_breach_heavy > 0:
        conf = rain_breach_heavy / available
        events.append({
            "event": "Heavy Rainfall",
            "severity": "High" if conf >= 0.67 else "Moderate",
            "confidence": round(conf, 2),
            "model_agreement": rain_breach_heavy,
            "total_models": available,
            "metric_details": f"Max 24h rainfall: {max_rain:.1f} mm (threshold: {RAINFALL_THRESHOLD_HEAVY_RAIN} mm)",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })

    # ── 2. Heat ─────────────────────────────────────────────────────────────
    heat_breach_extreme = _count_breach("temperature_max", TEMP_THRESHOLD_EXTREME_HEAT)
    heat_breach         = _count_breach("temperature_max", TEMP_THRESHOLD_HEAT)
    max_temp = _max_across_models("temperature_max")

    if heat_breach_extreme > 0 and max_temp is not None:
        conf = heat_breach_extreme / available
        events.append({
            "event": "Extreme Heat",
            "severity": "Extreme" if conf >= 0.67 else "High",
            "confidence": round(conf, 2),
            "model_agreement": heat_breach_extreme,
            "total_models": available,
            "metric_details": f"Max temperature across models: {max_temp:.1f}°C (threshold: {TEMP_THRESHOLD_EXTREME_HEAT}°C)",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })
    elif heat_breach > 0 and max_temp is not None:
        conf = heat_breach / available
        events.append({
            "event": "Heat Conditions",
            "severity": "High" if conf >= 0.67 else "Moderate",
            "confidence": round(conf, 2),
            "model_agreement": heat_breach,
            "total_models": available,
            "metric_details": f"Max temperature: {max_temp:.1f}°C (threshold: {TEMP_THRESHOLD_HEAT}°C)",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })

    # ── 3. High Wind ────────────────────────────────────────────────────────
    storm_breach = _count_breach("wind_speed_max", WIND_THRESHOLD_STORM)
    wind_breach  = _count_breach("wind_speed_max", WIND_THRESHOLD_HIGH)
    max_wind = _max_across_models("wind_speed_max")

    if storm_breach > 0 and max_wind is not None:
        conf = storm_breach / available
        events.append({
            "event": "Storm / Convective Wind",
            "severity": "Extreme" if conf >= 0.67 else "High",
            "confidence": round(conf, 2),
            "model_agreement": storm_breach,
            "total_models": available,
            "metric_details": f"Max wind speed: {max_wind:.1f} km/h (threshold: {WIND_THRESHOLD_STORM} km/h)",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })
    elif wind_breach > 0 and max_wind is not None:
        conf = wind_breach / available
        events.append({
            "event": "High Wind",
            "severity": "High" if conf >= 0.67 else "Moderate",
            "confidence": round(conf, 2),
            "model_agreement": wind_breach,
            "total_models": available,
            "metric_details": f"Max wind speed: {max_wind:.1f} km/h (threshold: {WIND_THRESHOLD_HIGH} km/h)",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })

    # ── 4. Convective / CAPE ────────────────────────────────────────────────
    cape_severe = _count_breach("cape_max", CAPE_THRESHOLD_SEVERE)
    cape_conv   = _count_breach("cape_max", CAPE_THRESHOLD_CONVECTIVE)
    max_cape = _max_across_models("cape_max")

    if cape_severe > 0 and max_cape is not None:
        conf = cape_severe / available
        events.append({
            "event": "Severe Convective Activity (High CAPE)",
            "severity": "High",
            "confidence": round(conf, 2),
            "model_agreement": cape_severe,
            "total_models": available,
            "metric_details": f"Max CAPE: {max_cape:.0f} J/kg (threshold: {CAPE_THRESHOLD_SEVERE} J/kg)",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })
    elif cape_conv > 0 and max_cape is not None:
        conf = cape_conv / available
        events.append({
            "event": "Convective Activity (Elevated CAPE)",
            "severity": "Moderate",
            "confidence": round(conf, 2),
            "model_agreement": cape_conv,
            "total_models": available,
            "metric_details": f"Max CAPE: {max_cape:.0f} J/kg (threshold: {CAPE_THRESHOLD_CONVECTIVE} J/kg)",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })

    if not events:
        events.append({
            "event": "No Significant Extreme Events Detected",
            "severity": "Low",
            "confidence": 1.0,
            "model_agreement": available,
            "total_models": available,
            "metric_details": "All monitored parameters within normal thresholds for the 24h window.",
            "location": location_name,
            "disclaimer": DISCLAIMER,
            "data_available": True,
        })

    return events
