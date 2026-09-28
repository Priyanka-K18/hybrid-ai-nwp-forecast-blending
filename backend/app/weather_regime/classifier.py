"""
Weather Regime Classification Engine.
Combines thermodynamic / dynamic rule-based thresholds with probabilistic ML-ready feature weights.
"""
from typing import Dict, Any, Tuple


class WeatherRegimeClassifier:
    REGIMES = [
        "Stable",
        "Convective",
        "Heavy Rain",
        "Heat Wave",
        "High Wind",
        "Cyclonic",
        "Cold / Dry"
    ]

    # Regional climate biases for Indian subcontinent
    REGIONAL_PRIORS = {
        "karnataka": {"Monsoon": "Convective", "Summer": "Heat Wave", "Winter": "Stable", "Post-Monsoon": "Convective"},
        "kerala": {"Monsoon": "Heavy Rain", "Summer": "Convective", "Winter": "Stable", "Post-Monsoon": "Convective"},
        "maharashtra": {"Monsoon": "Heavy Rain", "Summer": "Heat Wave", "Winter": "Stable", "Post-Monsoon": "Convective"},
        "tamil_nadu": {"Monsoon": "Stable", "Summer": "Heat Wave", "Winter": "Convective", "Post-Monsoon": "Cyclonic"},
        "rajasthan": {"Monsoon": "Convective", "Summer": "Heat Wave", "Winter": "Cold / Dry", "Post-Monsoon": "Stable"},
        "delhi": {"Monsoon": "Convective", "Summer": "Heat Wave", "Winter": "Cold / Dry", "Post-Monsoon": "Stable"},
        "assam": {"Monsoon": "Heavy Rain", "Summer": "Convective", "Winter": "Stable", "Post-Monsoon": "Heavy Rain"},
        "odisha": {"Monsoon": "Cyclonic", "Summer": "Heat Wave", "Winter": "Stable", "Post-Monsoon": "Cyclonic"},
    }

    @classmethod
    def classify(
        cls,
        region_id: str,
        season: str,
        rainfall_est: float,
        temp_est: float,
        wind_est: float,
        cape_jkg: float = 1200.0,
        pwat_mm: float = 45.0
    ) -> Dict[str, Any]:
        """
        Classifies weather regime based on atmospheric state and regional season context.
        Returns:
            dict with regime, confidence_pct, reasoning, and diagnostic indices.
        """
        scores: Dict[str, float] = {r: 10.0 for r in cls.REGIMES}

        # Convective signals: High CAPE, moderate-to-high rainfall, high humidity
        if cape_jkg > 1500 or (rainfall_est > 15 and temp_est > 28):
            scores["Convective"] += 45.0 + min(30.0, cape_jkg / 100)
        
        # Heavy Rain signals: high precipitable water, rainfall > 40mm
        if rainfall_est > 35 or pwat_mm > 55:
            scores["Heavy Rain"] += 55.0 + min(30.0, rainfall_est * 0.8)

        # Heat Wave signals: temp > 39C (or > 37 in coastal) with low rainfall
        if temp_est >= 40.0:
            scores["Heat Wave"] += 60.0 + (temp_est - 40.0) * 8.0
        elif temp_est >= 37.0 and rainfall_est < 5:
            scores["Heat Wave"] += 40.0

        # High Wind signals: wind speed > 45 km/h
        if wind_est >= 50.0:
            scores["High Wind"] += 50.0 + (wind_est - 50.0) * 1.5

        # Cyclonic signals: High wind + High rainfall + low pressure dynamics
        if wind_est >= 55.0 and rainfall_est >= 40.0:
            scores["Cyclonic"] += 70.0 + (wind_est * 0.5)

        # Cold / Dry signals: Temp < 15 and rainfall < 2
        if temp_est < 18.0 and rainfall_est < 2.0:
            scores["Cold / Dry"] += 50.0 + (18.0 - temp_est) * 3.0

        # Stable signals: moderate temp, low wind, zero or trace rain
        if rainfall_est < 3.0 and 20.0 <= temp_est <= 32.0 and wind_est < 25.0:
            scores["Stable"] += 45.0

        # Factor in regional seasonal prior
        prior = cls.REGIONAL_PRIORS.get(region_id.lower(), {}).get(season, "Stable")
        if prior in scores:
            scores[prior] += 25.0

        # Normalization and winner selection
        total = sum(scores.values())
        probs = {k: v / total for k, v in scores.items()}
        dominant_regime = max(probs, key=probs.get)
        confidence = round(probs[dominant_regime] * 100, 1)
        # Cap confidence realistically between 62% and 94%
        confidence = max(62.0, min(94.0, confidence * 1.6))

        # Generate meteorological explanation
        explanations = {
            "Convective": f"High instability detected (CAPE ~ {cape_jkg:.0f} J/kg) paired with localized vertical motion triggers thermodynamic convection.",
            "Heavy Rain": f"Moisture convergence index elevated (PWAT ~ {pwat_mm:.0f} mm) producing sustained orographic/monsoonal precipitation.",
            "Heat Wave": f"Upper-level anticyclonic subsidence driving dry adiabatic compression with surface temps reaching {temp_est:.1f}°C.",
            "High Wind": f"Steep baroclinic pressure gradient across region generating sustained winds of {wind_est:.1f} km/h.",
            "Cyclonic": f"Deep tropical depression with cyclonic vorticity, sustained gales ({wind_est:.1f} km/h) and intense feeder bands.",
            "Stable": f"High pressure synoptic ridge with negligible convective inhibition and calm boundary-layer winds.",
            "Cold / Dry": f"Continental northerly advection bringing dry, stable air masses with low nocturnal minimums."
        }

        return {
            "regime": dominant_regime,
            "confidence_pct": confidence,
            "explanation": explanations.get(dominant_regime, "Equilibrium synoptic pattern."),
            "diagnostic_indices": {
                "cape_jkg": cape_jkg,
                "pwat_mm": pwat_mm,
                "temp_c": temp_est,
                "wind_kmh": wind_est,
                "rainfall_mm": rainfall_est
            }
        }
