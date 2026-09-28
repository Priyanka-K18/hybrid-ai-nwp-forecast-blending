from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class ModelInfo(BaseModel):
    id: str
    name: str
    type: str  # NWP, Ensemble, AI_ML, Blended
    description: str
    resolution_km: float
    update_frequency_hours: int
    source_agency: str
    is_active: bool = True


class ForecastDataPoint(BaseModel):
    timestamp: str
    lead_time_hours: int
    rainfall_mm: float
    temperature_c: float
    wind_speed_kmh: float
    confidence_pct: float
    uncertainty_std: float


class ModelForecastDetail(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    rainfall_mm: float
    temperature_c: float
    wind_speed_kmh: float
    weight: float
    reliability_score: float
    historical_mae: float


class BlendedForecastResult(BaseModel):
    region_id: str
    region_name: str
    lead_time_hours: int
    season: str
    weather_regime: str
    regime_confidence: float
    regime_explanation: str
    rainfall_mm: float
    temperature_c: float
    wind_speed_kmh: float
    confidence_pct: float
    confidence_level: str  # HIGH, MEDIUM, LOW
    confidence_rationale: str
    dominant_model: str
    model_agreement_pct: float
    formula_latex: str
    model_weights: Dict[str, float]
    model_contributions: List[ModelForecastDetail]
    extreme_risk_level: str  # Low, Moderate, High, Critical
    extreme_risk_summary: str
    is_demo_data: bool = True
    generated_at: str


class RegionalWeightDetail(BaseModel):
    region_id: str
    region_name: str
    latitude: float
    longitude: float
    nwp_weight: float
    ensemble_weight: float
    aiml_weight: float
    dominant_model: str
    historical_best_model: str
    confidence: str
    sample_rainfall_blend: float
    sample_temp_blend: float
    sample_wind_blend: float
    is_demo_data: bool = True


class WeightMapResponse(BaseModel):
    variable: str
    lead_time_hours: int
    season: str
    weather_regime: str
    regions: List[RegionalWeightDetail]
    average_weights: Dict[str, float]
    is_demo_data: bool = True


class SkillMetricDetail(BaseModel):
    model_id: str
    model_name: str
    mae: float
    rmse: float
    bias: float
    crps: float
    brier_score: float
    csi: float  # Critical Success Index
    pod: float  # Probability of Detection
    far: float  # False Alarm Ratio
    rank: int


class ModelSkillResponse(BaseModel):
    variable: str
    region: str
    season: str
    lead_time_hours: int
    weather_regime: str
    metrics: List[SkillMetricDetail]
    skill_by_lead_time: List[Dict[str, Any]]
    skill_by_region: List[Dict[str, Any]]
    skill_by_season: List[Dict[str, Any]]
    error_trend: List[Dict[str, Any]]
    is_demo_data: bool = True


class ExtremeAlert(BaseModel):
    event_id: str
    event_type: str  # HEAVY_RAINFALL, HEAT_WAVE, HIGH_WIND, CYCLONIC
    risk_level: str  # Low, Moderate, High, Critical
    title: str
    description: str
    probability_pct: float
    expected_metric: str  # e.g., "78 mm accumulation", "43.5 °C peak", "85 km/h gusts"
    expected_duration_hours: int
    affected_regions: List[str]
    confidence_level: str
    recommended_action: str
    disclaimer: str = "Decision-support signal only. Not an official IMD meteorological warning."


class VerificationCycleResult(BaseModel):
    cycle_id: str
    timestamp: str
    region: str
    variable: str
    lead_time_hours: int
    observation_value: float
    nwp_forecast: float
    nwp_error: float
    ensemble_forecast: float
    ensemble_error: float
    aiml_forecast: float
    aiml_error: float
    blended_forecast: float
    blended_error: float
    best_model: str
    skill_improvement_vs_best_single_pct: float
    recalibrated_weights: Dict[str, float]
    is_demo_data: bool = True


class OperationalStepLog(BaseModel):
    step_number: int
    name: str
    status: str  # READY, RUNNING, COMPLETED, WARNING, FAILED
    duration_ms: int
    timestamp: str
    details: str


class OperationalRunStatus(BaseModel):
    run_id: str
    started_at: str
    completed_at: Optional[str] = None
    overall_status: str  # READY, RUNNING, COMPLETED, FAILED
    current_step: int
    total_steps: int
    steps: List[OperationalStepLog]
    active_sources: int
    records_processed: int
    is_demo_mode: bool = True


class WhatIfSimulationRequest(BaseModel):
    region_id: str = "karnataka"
    lead_time_hours: int = 24
    season: str = "Monsoon"
    weather_regime: str = "Convective"
    nwp_reliability_modifier: float = 1.0  # 0.2 to 2.0
    ensemble_reliability_modifier: float = 1.0
    aiml_reliability_modifier: float = 1.0
    uncertainty_level: float = 0.5  # 0 to 1
    custom_formula_weighting: Optional[Dict[str, float]] = None


class WhatIfSimulationResponse(BaseModel):
    base_weights: Dict[str, float]
    adjusted_weights: Dict[str, float]
    base_blended_forecast: Dict[str, float]
    adjusted_blended_forecast: Dict[str, float]
    confidence_delta_pct: float
    explanation: str
    is_demo_data: bool = True
