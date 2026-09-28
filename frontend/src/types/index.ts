export interface Region {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zone: string;
  default_regime: string;
}

export interface ModelContribution {
  model_id: string;
  model_name: string;
  model_type: 'NWP' | 'Ensemble' | 'AI_ML' | 'Blended';
  rainfall_mm: number;
  temperature_c: number;
  wind_speed_kmh: number;
  weight: number;
  reliability_score: number;
  historical_mae: number;
}

export interface BlendedForecastResult {
  region_id: string;
  region_name: string;
  lead_time_hours: number;
  season: string;
  weather_regime: string;
  regime_confidence: number;
  regime_explanation: string;
  rainfall_mm: number;
  temperature_c: number;
  wind_speed_kmh: number;
  confidence_pct: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_rationale: string;
  dominant_model: string;
  model_agreement_pct: number;
  formula_latex: string;
  model_weights: {
    nwp: number;
    ensemble: number;
    aiml: number;
  };
  model_contributions: ModelContribution[];
  extreme_risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  extreme_risk_summary: string;
  is_demo_data: boolean;
  generated_at: string;
  explanation?: {
    dominant_model: string;
    dominant_share_pct: number;
    summary: string;
    drivers: string[];
    weight_breakdown: Record<string, number>;
  };
}

export interface RegionalWeightDetail {
  region_id: string;
  region_name: string;
  latitude: number;
  longitude: number;
  nwp_weight: number;
  ensemble_weight: number;
  aiml_weight: number;
  dominant_model: string;
  historical_best_model: string;
  confidence: string;
  sample_rainfall_blend: number;
  sample_temp_blend: number;
  sample_wind_blend: number;
  is_demo_data: boolean;
}

export interface WeightMapResponse {
  variable: string;
  lead_time_hours: number;
  season: string;
  weather_regime: string;
  regions: RegionalWeightDetail[];
  average_weights: {
    nwp: number;
    ensemble: number;
    aiml: number;
  };
  is_demo_data: boolean;
}

export interface SkillMetricDetail {
  model_id: string;
  model_name: string;
  mae: number;
  rmse: number;
  bias: number;
  crps: number;
  brier_score: number;
  csi: number;
  pod: number;
  far: number;
  rank: number;
}

export interface ModelSkillResponse {
  variable: string;
  region: string;
  season: string;
  lead_time_hours: number;
  weather_regime: string;
  metrics: SkillMetricDetail[];
  skill_by_lead_time: Array<{
    lead_time: string;
    lead_hours: number;
    NWP: number;
    Ensemble: number;
    AI_ML: number;
    Blended: number;
  }>;
  skill_by_region: Array<{
    region: string;
    NWP: number;
    Ensemble: number;
    AI_ML: number;
    Blended: number;
  }>;
  skill_by_season: Array<{
    season: string;
    NWP: number;
    Ensemble: number;
    AI_ML: number;
    Blended: number;
  }>;
  error_trend: Array<{
    date: string;
    NWP: number;
    Ensemble: number;
    AI_ML: number;
    Blended: number;
  }>;
  is_demo_data: boolean;
}

export interface ExtremeAlert {
  event_id: string;
  event_type: 'HEAVY_RAINFALL' | 'HEAT_WAVE' | 'HIGH_WIND' | 'CYCLONIC';
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  title: string;
  description: string;
  probability_pct: number;
  expected_metric: string;
  expected_duration_hours: number;
  affected_regions: string[];
  confidence_level: string;
  recommended_action: string;
  disclaimer: string;
}

export interface VerificationCycleResult {
  cycle_id: string;
  timestamp: string;
  region: string;
  variable: string;
  lead_time_hours: number;
  observation_value: number;
  nwp_forecast: number;
  nwp_error: number;
  ensemble_forecast: number;
  ensemble_error: number;
  aiml_forecast: number;
  aiml_error: number;
  blended_forecast: number;
  blended_error: number;
  best_single_model: string;
  best_overall: string;
  blended_improvement_pct: number;
  recalibrated_skills: Record<string, number>;
  is_demo_data: boolean;
}

export interface OperationalStepLog {
  step_number: number;
  name: string;
  status: 'READY' | 'RUNNING' | 'COMPLETED' | 'WARNING' | 'FAILED';
  duration_ms: number;
  timestamp: string;
  details: string;
}

export interface OperationalRunStatus {
  run_id: string;
  started_at: string;
  completed_at?: string;
  overall_status: 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  current_step: number;
  total_steps: number;
  steps: OperationalStepLog[];
  active_sources: number;
  records_processed: number;
  is_demo_mode: boolean;
}

export interface WhatIfResponse {
  base_weights: { nwp: number; ensemble: number; aiml: number };
  adjusted_weights: { nwp: number; ensemble: number; aiml: number };
  base_blended_forecast: { rainfall: number; temperature: number; wind: number };
  adjusted_blended_forecast: { rainfall: number; temperature: number; wind: number };
  confidence_delta_pct: number;
  explanation: string;
  is_demo_data: boolean;
}
