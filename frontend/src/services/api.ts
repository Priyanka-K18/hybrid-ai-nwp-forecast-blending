import {
  BlendedForecastResult,
  WeightMapResponse,
  ModelSkillResponse,
  ExtremeAlert,
  VerificationCycleResult,
  OperationalRunStatus,
  WhatIfResponse,
  Region,
} from '../types';

const API_BASE = '/api';

export async function fetchRegions(): Promise<Region[]> {
  const res = await fetch(`${API_BASE}/regions`);
  if (!res.ok) throw new Error('Failed to fetch regions');
  return res.json();
}

export async function fetchForecast(
  region = 'karnataka',
  leadTime = 24,
  season = 'Monsoon',
  regime?: string
): Promise<BlendedForecastResult> {
  let url = `${API_BASE}/forecast?region=${region}&lead_time=${leadTime}&season=${encodeURIComponent(season)}`;
  if (regime) {
    url += `&regime=${encodeURIComponent(regime)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch blended forecast');
  return res.json();
}

export async function fetchWeightMap(
  variable = 'rainfall',
  leadTime = 24,
  season = 'Monsoon',
  regime = 'Convective'
): Promise<WeightMapResponse> {
  const url = `${API_BASE}/weights/map?variable=${variable}&lead_time=${leadTime}&season=${encodeURIComponent(
    season
  )}&regime=${encodeURIComponent(regime)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch weight map');
  return res.json();
}

export async function fetchModelSkill(
  modelId = 'aiml',
  variable = 'rainfall',
  region = 'karnataka',
  season = 'Monsoon',
  leadTime = 24,
  regime = 'Convective'
): Promise<ModelSkillResponse> {
  const url = `${API_BASE}/models/${modelId}/skill?variable=${variable}&region=${region}&season=${encodeURIComponent(
    season
  )}&lead_time=${leadTime}&regime=${encodeURIComponent(regime)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch model skill');
  return res.json();
}

export async function fetchExtremeAlerts(): Promise<ExtremeAlert[]> {
  const res = await fetch(`${API_BASE}/extremes`);
  if (!res.ok) throw new Error('Failed to fetch extreme weather signals');
  return res.json();
}

export async function fetchVerificationHistory(limit = 15): Promise<{
  cycles: VerificationCycleResult[];
  current_skill_cache: Record<string, Record<string, number>>;
  is_demo_data: boolean;
}> {
  const res = await fetch(`${API_BASE}/verification?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch verification history');
  return res.json();
}

export async function triggerVerificationRun(payload: {
  region: string;
  variable: string;
  lead_time: number;
  observation: number;
  nwp_forecast: number;
  ensemble_forecast: number;
  aiml_forecast: number;
  blended_forecast: number;
}) {
  const res = await fetch(`${API_BASE}/verification/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to trigger verification cycle');
  return res.json();
}

export async function fetchOperationalStatus(): Promise<OperationalRunStatus> {
  const res = await fetch(`${API_BASE}/operational/status`);
  if (!res.ok) throw new Error('Failed to fetch operational run status');
  return res.json();
}

export async function triggerForecastRun(): Promise<{ message: string; run: OperationalRunStatus }> {
  const res = await fetch(`${API_BASE}/forecast/run`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger forecast run');
  return res.json();
}

export async function fetchDataSources(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/data/sources`);
  if (!res.ok) throw new Error('Failed to fetch data sources');
  return res.json();
}

export async function simulateWhatIf(payload: {
  region_id: string;
  lead_time_hours: number;
  season: string;
  weather_regime: string;
  nwp_reliability_modifier: number;
  ensemble_reliability_modifier: number;
  aiml_reliability_modifier: number;
  uncertainty_level: number;
}): Promise<WhatIfResponse> {
  const res = await fetch(`${API_BASE}/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to run what-if simulation');
  return res.json();
}

export async function uploadDataset(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/data/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload forecast dataset');
  return res.json();
}

// ─── Open-Meteo Live Data Endpoints ─────────────────────────────────────────

export interface OpenMeteoLocation {
  city?: string;
  latitude?: number;
  longitude?: number;
}

export async function fetchOpenMeteoForecast(
  loc: OpenMeteoLocation,
  leadTime = 24,
  season = 'Monsoon',
  regime?: string,
  models?: string[]
): Promise<any> {
  const params = new URLSearchParams();
  if (loc.city) params.set('city', loc.city);
  if (loc.latitude != null) params.set('latitude', String(loc.latitude));
  if (loc.longitude != null) params.set('longitude', String(loc.longitude));
  params.set('lead_time', String(leadTime));
  params.set('season', season);
  if (regime) params.set('regime', regime);
  if (models?.length) params.set('models', models.join(','));

  const res = await fetch(`${API_BASE}/weather/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.statusText}`);
  return res.json();
}

export async function fetchOpenMeteoBlended(
  loc: OpenMeteoLocation,
  leadTime = 24,
  season = 'Monsoon',
  regime?: string
): Promise<any> {
  const params = new URLSearchParams();
  if (loc.city) params.set('city', loc.city);
  if (loc.latitude != null) params.set('latitude', String(loc.latitude));
  if (loc.longitude != null) params.set('longitude', String(loc.longitude));
  params.set('lead_time', String(leadTime));
  params.set('season', season);
  if (regime) params.set('regime', regime);

  const res = await fetch(`${API_BASE}/weather/blended?${params.toString()}`);
  if (!res.ok) throw new Error(`Blended forecast failed: ${res.statusText}`);
  return res.json();
}

export async function fetchOpenMeteoWeights(
  variable = 'precipitation',
  leadTime = 24,
  season = 'Monsoon',
  regime = 'Normal',
  availableModels?: string[]
): Promise<any> {
  const params = new URLSearchParams({ variable, season, regime });
  params.set('lead_time', String(leadTime));
  if (availableModels?.length) params.set('available_models', availableModels.join(','));

  const res = await fetch(`${API_BASE}/weather/weights?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather weights failed: ${res.statusText}`);
  return res.json();
}

export async function fetchOpenMeteoMetrics(
  loc: OpenMeteoLocation,
  daysBack = 7
): Promise<any> {
  const params = new URLSearchParams();
  if (loc.city) params.set('city', loc.city);
  if (loc.latitude != null) params.set('latitude', String(loc.latitude));
  if (loc.longitude != null) params.set('longitude', String(loc.longitude));
  params.set('days_back', String(daysBack));

  const res = await fetch(`${API_BASE}/weather/metrics?${params.toString()}`);
  if (!res.ok) throw new Error(`Historical metrics failed: ${res.statusText}`);
  return res.json();
}

export async function fetchOpenMeteoExtremes(
  loc: OpenMeteoLocation,
  season = 'Monsoon'
): Promise<any> {
  const params = new URLSearchParams({ season });
  if (loc.city) params.set('city', loc.city);
  if (loc.latitude != null) params.set('latitude', String(loc.latitude));
  if (loc.longitude != null) params.set('longitude', String(loc.longitude));

  const res = await fetch(`${API_BASE}/weather/extremes?${params.toString()}`);
  if (!res.ok) throw new Error(`Extreme weather detection failed: ${res.statusText}`);
  return res.json();
}

export async function geocodeCity(city: string): Promise<{
  name: string; latitude: number; longitude: number;
  country: string; admin1: string; timezone: string;
} | null> {
  const res = await fetch(`${API_BASE}/weather/geocode?city=${encodeURIComponent(city)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Geocoding failed: ${res.statusText}`);
  return res.json();
}

export async function fetchOpenMeteoModels(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/weather/models`);
  if (!res.ok) throw new Error('Failed to fetch Open-Meteo models');
  return res.json();
}

export async function fetchCacheStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/weather/cache`);
  if (!res.ok) throw new Error('Failed to fetch cache status');
  return res.json();
}

export async function clearWeatherCache(): Promise<any> {
  const res = await fetch(`${API_BASE}/weather/cache`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear cache');
  return res.json();
}

export interface ProviderProbeResult {
  name: string;
  target: string;
  url: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  status_code: number | null;
  latency_ms: number;
  error: string | null;
}

export interface SystemHealthData {
  status: 'HEALTHY' | 'DEGRADED';
  timestamp: string;
  uptime_seconds: number;
  runtime: {
    python_version: string;
    os: string;
    server: string;
    environment: string;
  };
  database: {
    status: string;
    engine: string;
    url: string;
    size_bytes: number;
    tables: string[];
  };
  cache: {
    total_entries: number;
    valid_entries: number;
    active_entries: number;
    stale_entries: number;
    ttl_seconds: number;
    hits: number;
    misses: number;
    hit_rate_pct: number;
  };
  operational_pipeline: {
    cycle_id: string;
    status: string;
    stages_count: number;
    last_cycle_timestamp: string | null;
  };
}

export async function fetchSystemHealth(): Promise<SystemHealthData> {
  const res = await fetch(`${API_BASE}/system/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function probeProviders(): Promise<{ timestamp: string; providers: ProviderProbeResult[] }> {
  const res = await fetch(`${API_BASE}/system/probe-providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Provider connectivity probe failed');
  return res.json();
}

export async function vacuumDatabase(): Promise<{
  status: string;
  message: string;
  initial_size_bytes: number;
  final_size_bytes: number;
  reclaimed_bytes: number;
}> {
  const res = await fetch(`${API_BASE}/system/vacuum-db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Database vacuum failed');
  return res.json();
}

