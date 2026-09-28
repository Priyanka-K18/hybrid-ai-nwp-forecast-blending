import React, { useState, useCallback } from 'react';
import {
  MapPin, Thermometer, Droplets, Wind, Eye, Gauge,
  Cloud, Zap, AlertTriangle, RefreshCw, Search,
  BarChart3, TrendingUp, CheckCircle, XCircle, Clock,
  Info, Globe, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { fetchOpenMeteoBlended } from '../services/api';

/* ─── Colour palette ──────────────────────────────────────────────────────── */
const MODEL_COLORS: Record<string, string> = {
  ECMWF: '#6366f1',
  GFS:   '#22d3ee',
  ICON:  '#f59e0b',
};
const SEVERITY_COLORS: Record<string, string> = {
  Extreme: '#ef4444',
  High:    '#f97316',
  Moderate:'#eab308',
  Low:     '#22c55e',
  Unknown: '#6b7280',
};
const SEASONS = ['Monsoon', 'Summer', 'Winter', 'Post-Monsoon', 'Pre-Monsoon'];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatCard({
  icon, label, value, unit, sub, color = '#6366f1',
}: {
  icon: React.ReactNode; label: string; value: string | number | null;
  unit?: string; sub?: string; color?: string;
}) {
  return (
    <div className="stat-card" style={{ borderColor: color + '40' }}>
      <div className="stat-icon" style={{ color, background: color + '20' }}>{icon}</div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <span className="stat-value">
          {value != null ? value : <span className="unavailable">N/A</span>}
          {value != null && unit && <span className="stat-unit"> {unit}</span>}
        </span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

function ModelCard({
  model, data, weight,
}: {
  model: string; data: any; weight: number;
}) {
  const color = MODEL_COLORS[model] ?? '#888';
  return (
    <div className="model-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="model-header">
        <span className="model-name" style={{ color }}>{model}</span>
        <span className="model-weight-badge" style={{ background: color + '30', color }}>
          {(weight * 100).toFixed(1)}%
        </span>
      </div>
      {data.data_available ? (
        <div className="model-metrics">
          <div className="model-row">
            <Thermometer size={13} />
            <span>Temp</span>
            <strong>{data.temperature_mean?.toFixed(1) ?? '—'}°C</strong>
          </div>
          <div className="model-row">
            <Droplets size={13} />
            <span>Precip</span>
            <strong>{data.precipitation_total?.toFixed(1) ?? '—'} mm</strong>
          </div>
          <div className="model-row">
            <Wind size={13} />
            <span>Wind</span>
            <strong>{data.wind_speed_mean?.toFixed(1) ?? '—'} km/h</strong>
          </div>
          <div className="model-row">
            <Cloud size={13} />
            <span>Cloud</span>
            <strong>{data.cloud_cover_mean?.toFixed(0) ?? '—'}%</strong>
          </div>
          {data.cape_max != null && (
            <div className="model-row">
              <Zap size={13} />
              <span>CAPE</span>
              <strong>{data.cape_max.toFixed(0)} J/kg</strong>
            </div>
          )}
        </div>
      ) : (
        <div className="model-unavailable">
          <XCircle size={14} />
          <span>{data.error ?? 'Data unavailable'}</span>
        </div>
      )}
    </div>
  );
}

function ExtremeSignalCard({ signal }: { signal: any }) {
  const color = SEVERITY_COLORS[signal.severity] ?? '#6b7280';
  return (
    <div className="extreme-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="extreme-header">
        <AlertTriangle size={14} style={{ color }} />
        <span className="extreme-event" style={{ color }}>{signal.event}</span>
        <span className="extreme-severity" style={{ background: color + '20', color }}>
          {signal.severity}
        </span>
        {signal.data_available && (
          <span className="extreme-conf">
            {(signal.confidence * 100).toFixed(0)}% conf
            ({signal.model_agreement}/{signal.total_models} models)
          </span>
        )}
      </div>
      <p className="extreme-detail">{signal.metric_details}</p>
      <p className="extreme-disclaimer">{signal.disclaimer}</p>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────*/

export const LiveWeatherForecast: React.FC = () => {
  // Location state
  const [cityInput, setCityInput] = useState('Bengaluru');
  const [latInput, setLatInput] = useState('12.9716');
  const [lonInput, setLonInput] = useState('77.5946');
  const [useCoords, setUseCoords] = useState(false);
  const [season, setSeason] = useState('Monsoon');
  const [leadTime, setLeadTime] = useState(24);

  // Data state
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = useCoords
        ? { latitude: parseFloat(latInput), longitude: parseFloat(lonInput) }
        : { city: cityInput.trim() };
      const result = await fetchOpenMeteoBlended(loc, leadTime, season);
      setData(result);
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch forecast');
    } finally {
      setLoading(false);
    }
  }, [cityInput, latInput, lonInput, useCoords, season, leadTime]);

  /* ── Derived values ─────────────────────────────────────────────────────── */
  const location = data?.location;
  const models: Record<string, any> = data?.models ?? {};
  const blended = data?.blended_forecast ?? {};
  const blendedSummary = blended.blended_summary ?? {};
  const weights = data?.weights?.precipitation ?? {};
  const extremes: any[] = data?.extreme_signals ?? [];
  const regime = data?.request?.weather_regime_detected ?? '—';
  const modelsAvailable: string[] = data?.request?.models_available ?? [];
  const modelsUnavailable: string[] = data?.request?.models_unavailable ?? [];

  /* ── Charts ──────────────────────────────────────────────────────────────── */
  // Model comparison bar chart
  const comparisonData = [
    {
      metric: 'Temp (°C)',
      ...Object.fromEntries(
        Object.entries(models).map(([m, d]) => [m, d.temperature_mean])
      ),
    },
    {
      metric: 'Precip (mm)',
      ...Object.fromEntries(
        Object.entries(models).map(([m, d]) => [m, d.precipitation_total])
      ),
    },
    {
      metric: 'Wind (km/h)',
      ...Object.fromEntries(
        Object.entries(models).map(([m, d]) => [m, d.wind_speed_mean])
      ),
    },
  ];

  // Hourly timeline from first available model
  const firstAvailable = modelsAvailable[0];
  const hourlyRaw = firstAvailable ? (models[firstAvailable]?.hourly_data ?? []) : [];
  const hourlyChart = hourlyRaw.slice(0, 24).map((h: any) => ({
    time: h.time ? h.time.slice(11, 16) : '',
    temp: h.temperature_2m,
    precip: h.precipitation,
    wind: h.wind_speed_10m,
    humidity: h.relative_humidity_2m,
  }));

  // Weight radar
  const radarData = Object.entries(weights).map(([model, w]) => ({
    model,
    weight: Math.round((w as number) * 100),
  }));

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="lw-page">
      <style>{`
        .lw-page { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
        .lw-header { display:flex; align-items:center; gap:.75rem; margin-bottom:1.5rem; }
        .lw-title { font-size:1.5rem; font-weight:700; background:linear-gradient(135deg,#6366f1,#22d3ee); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .lw-subtitle { color:var(--text-secondary,#94a3b8); font-size:.85rem; margin-left:auto; }
        
        .lw-controls { display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:.75rem; align-items:end; padding:1rem; background:var(--card-bg,#1e293b); border-radius:12px; border:1px solid var(--border,#334155); margin-bottom:1.5rem; }
        .control-group { display:flex; flex-direction:column; gap:.35rem; }
        .control-label { font-size:.7rem; color:var(--text-secondary,#94a3b8); text-transform:uppercase; letter-spacing:.05em; }
        .control-input { background:var(--input-bg,#0f172a); border:1px solid var(--border,#334155); border-radius:8px; color:var(--text,#e2e8f0); padding:.5rem .75rem; font-size:.85rem; width:100%; }
        .control-input:focus { outline:none; border-color:#6366f1; }
        .control-row { display:flex; gap:.5rem; }
        .coord-input { flex:1; }
        .toggle-btn { background:transparent; border:1px solid var(--border,#334155); color:var(--text-secondary,#94a3b8); border-radius:8px; padding:.35rem .6rem; font-size:.75rem; cursor:pointer; white-space:nowrap; }
        .toggle-btn.active { border-color:#6366f1; color:#6366f1; background:#6366f120; }
        .fetch-btn { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:10px; padding:.6rem 1.25rem; font-size:.875rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:.5rem; white-space:nowrap; min-width:130px; justify-content:center; }
        .fetch-btn:hover { opacity:.9; }
        .fetch-btn:disabled { opacity:.5; cursor:not-allowed; }

        .lw-status-bar { display:flex; align-items:center; gap:1rem; padding:.6rem 1rem; background:var(--card-bg,#1e293b); border-radius:8px; margin-bottom:1rem; font-size:.78rem; flex-wrap:wrap; }
        .status-pill { padding:.2rem .6rem; border-radius:20px; font-size:.72rem; font-weight:600; }
        .status-live { background:#22c55e20; color:#22c55e; }
        .status-model { background:#6366f120; color:#6366f1; }
        .status-unavail { background:#ef444420; color:#ef4444; }
        .status-regime { background:#f59e0b20; color:#f59e0b; }
        .status-time { color:var(--text-secondary,#64748b); margin-left:auto; display:flex; align-items:center; gap:.35rem; }

        .lw-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:.75rem; margin-bottom:1.5rem; }
        .stat-card { display:flex; align-items:center; gap:.75rem; padding:.75rem 1rem; background:var(--card-bg,#1e293b); border-radius:12px; border:1px solid var(--border,#334155); }
        .stat-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .stat-body { display:flex; flex-direction:column; min-width:0; }
        .stat-label { font-size:.65rem; color:var(--text-secondary,#94a3b8); text-transform:uppercase; letter-spacing:.06em; }
        .stat-value { font-size:1.1rem; font-weight:700; color:var(--text,#e2e8f0); white-space:nowrap; }
        .stat-unit { font-size:.75rem; font-weight:400; }
        .stat-sub { font-size:.65rem; color:var(--text-secondary,#64748b); }
        .unavailable { font-size:.75rem; color:#64748b; font-weight:400; }

        .lw-section { background:var(--card-bg,#1e293b); border-radius:14px; border:1px solid var(--border,#334155); padding:1.25rem; margin-bottom:1rem; }
        .section-title { font-size:.95rem; font-weight:700; color:var(--text,#e2e8f0); margin-bottom:1rem; display:flex; align-items:center; gap:.5rem; }
        .section-title svg { color:#6366f1; }

        .models-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:.75rem; }
        .model-card { background:var(--card-inner,#0f172a); border-radius:10px; border:1px solid var(--border,#334155); padding:.875rem; }
        .model-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.75rem; }
        .model-name { font-weight:700; font-size:.9rem; }
        .model-weight-badge { font-size:.72rem; padding:.15rem .45rem; border-radius:12px; font-weight:700; }
        .model-metrics { display:flex; flex-direction:column; gap:.35rem; }
        .model-row { display:flex; align-items:center; gap:.4rem; font-size:.78rem; color:var(--text-secondary,#94a3b8); }
        .model-row strong { margin-left:auto; color:var(--text,#e2e8f0); }
        .model-unavailable { display:flex; align-items:center; gap:.4rem; font-size:.75rem; color:#ef4444; padding:.5rem 0; }

        .weights-bar-list { display:flex; flex-direction:column; gap:.5rem; }
        .weight-bar-item { display:grid; grid-template-columns:80px 1fr 50px; align-items:center; gap:.75rem; font-size:.8rem; }
        .weight-bar-label { color:var(--text,#e2e8f0); font-weight:600; }
        .weight-bar-track { height:10px; background:var(--border,#334155); border-radius:5px; overflow:hidden; }
        .weight-bar-fill { height:100%; border-radius:5px; transition:width .5s ease; }
        .weight-bar-pct { color:var(--text-secondary,#94a3b8); text-align:right; }

        .blended-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; }
        .blended-metric { text-align:center; padding:.875rem; background:var(--card-inner,#0f172a); border-radius:10px; }
        .blended-label { font-size:.7rem; color:var(--text-secondary,#94a3b8); text-transform:uppercase; letter-spacing:.06em; margin-bottom:.25rem; }
        .blended-value { font-size:1.4rem; font-weight:800; color:var(--text,#e2e8f0); }
        .blended-unit { font-size:.8rem; font-weight:400; color:var(--text-secondary,#94a3b8); }
        .blended-conf { font-size:.7rem; color:#22d3ee; margin-top:.2rem; }

        .extreme-list { display:flex; flex-direction:column; gap:.5rem; }
        .extreme-card { background:var(--card-inner,#0f172a); border-radius:8px; padding:.75rem 1rem; }
        .extreme-header { display:flex; align-items:center; gap:.5rem; margin-bottom:.35rem; flex-wrap:wrap; }
        .extreme-event { font-weight:600; font-size:.82rem; flex:1; }
        .extreme-severity { font-size:.7rem; padding:.1rem .45rem; border-radius:12px; font-weight:700; }
        .extreme-conf { font-size:.68rem; color:var(--text-secondary,#64748b); margin-left:auto; }
        .extreme-detail { font-size:.75rem; color:var(--text-secondary,#94a3b8); margin:.2rem 0; }
        .extreme-disclaimer { font-size:.65rem; color:#64748b; font-style:italic; margin:0; }

        .charts-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        .chart-box { background:var(--card-bg,#1e293b); border-radius:12px; border:1px solid var(--border,#334155); padding:1rem; }
        .chart-title { font-size:.82rem; font-weight:600; color:var(--text-secondary,#94a3b8); margin-bottom:.75rem; }

        .disclaimer-bar { background:#1a1a2e; border:1px solid #6366f130; border-radius:8px; padding:.6rem 1rem; font-size:.72rem; color:#94a3b8; margin-bottom:1rem; display:flex; gap:.5rem; }
        .disclaimer-bar svg { color:#6366f1; flex-shrink:0; margin-top:1px; }

        .error-banner { background:#ef444420; border:1px solid #ef4444; border-radius:8px; padding:.75rem 1rem; color:#ef4444; font-size:.82rem; margin-bottom:1rem; display:flex; align-items:center; gap:.5rem; }
        .empty-state { text-align:center; padding:3rem; color:var(--text-secondary,#64748b); }
        .empty-state svg { margin-bottom:.75rem; opacity:.4; }
        .empty-title { font-size:1rem; font-weight:600; margin-bottom:.3rem; }
        .empty-desc { font-size:.82rem; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        @media(max-width:900px) {
          .lw-controls { grid-template-columns:1fr 1fr; }
          .charts-grid { grid-template-columns:1fr; }
          .blended-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media(max-width:600px) {
          .lw-controls { grid-template-columns:1fr; }
          .blended-grid { grid-template-columns:1fr; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="lw-header">
        <Globe size={22} color="#6366f1" />
        <h1 className="lw-title">Live NWP Weather Comparison</h1>
        <span className="lw-subtitle">Open-Meteo • ECMWF • GFS • ICON • Real data</span>
      </div>

      {/* ── Controls ── */}
      <div className="lw-controls">
        <div className="control-group">
          <span className="control-label">Location</span>
          <div className="control-row">
            <button className={`toggle-btn ${!useCoords ? 'active' : ''}`} onClick={() => setUseCoords(false)}>City</button>
            <button className={`toggle-btn ${useCoords ? 'active' : ''}`} onClick={() => setUseCoords(true)}>Lat/Lon</button>
          </div>
          {!useCoords ? (
            <input className="control-input" value={cityInput} onChange={e => setCityInput(e.target.value)}
              placeholder="e.g. Bengaluru" onKeyDown={e => e.key === 'Enter' && fetchData()} />
          ) : (
            <div className="control-row">
              <input className="control-input coord-input" value={latInput} onChange={e => setLatInput(e.target.value)} placeholder="Latitude" />
              <input className="control-input coord-input" value={lonInput} onChange={e => setLonInput(e.target.value)} placeholder="Longitude" />
            </div>
          )}
        </div>

        <div className="control-group">
          <span className="control-label">Season</span>
          <select className="control-input" value={season} onChange={e => setSeason(e.target.value)}>
            {SEASONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="control-group">
          <span className="control-label">Lead Time</span>
          <select className="control-input" value={leadTime} onChange={e => setLeadTime(Number(e.target.value))}>
            {[6, 12, 24, 48, 72, 120].map(h => <option key={h} value={h}>{h}h</option>)}
          </select>
        </div>

        <button className="fetch-btn" onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          {loading ? 'Fetching…' : 'Fetch Live Data'}
        </button>
      </div>

      {/* ── Disclaimer ── */}
      <div className="disclaimer-bar">
        <Info size={13} />
        <span>
          Data provided by <strong>Open-Meteo.com</strong> (CC BY 4.0) — free, no API key required.
          Model weights are heuristic estimates from literature MAE, not trained ML outputs.
          Extreme signals are AI/NWP decision-support only — <strong>NOT official government warnings</strong>.
        </span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="error-banner">
          <XCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Status bar ── */}
      {data && (
        <div className="lw-status-bar">
          <span className="status-pill status-live">● LIVE DATA</span>
          {modelsAvailable.map(m => (
            <span key={m} className="status-pill status-model">{m} ✓</span>
          ))}
          {modelsUnavailable.map(m => (
            <span key={m} className="status-pill status-unavail">{m} unavailable</span>
          ))}
          {regime !== '—' && (
            <span className="status-pill status-regime">Regime: {regime}</span>
          )}
          <span className="status-time">
            <Clock size={12} /> Last fetched: {lastFetched}
          </span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!data && !loading && !error && (
        <div className="lw-section empty-state">
          <Globe size={48} />
          <p className="empty-title">Enter a location and click Fetch Live Data</p>
          <p className="empty-desc">
            Retrieves real-time ECMWF, GFS, and ICON forecasts from Open-Meteo.com.
            No API key required.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* ── Location + Blended Summary Stats ── */}
          <div className="lw-section">
            <div className="section-title">
              <MapPin size={16} />
              {location?.name} — Blended Forecast Summary (24h)
            </div>
            <div className="lw-grid">
              <StatCard icon={<Thermometer size={18} />} label="Temperature" value={blendedSummary.temperature_mean?.toFixed(1)} unit="°C" sub={`Max ${blendedSummary.temperature_max?.toFixed(1) ?? '—'}°C`} color="#f97316" />
              <StatCard icon={<Droplets size={18} />} label="Precipitation" value={blendedSummary.precipitation_total?.toFixed(1)} unit="mm" sub="24h total" color="#22d3ee" />
              <StatCard icon={<Wind size={18} />} label="Wind Speed" value={blendedSummary.wind_speed_mean?.toFixed(1)} unit="km/h" sub={`Max ${blendedSummary.wind_speed_max?.toFixed(0) ?? '—'} km/h`} color="#6366f1" />
              <StatCard icon={<Gauge size={18} />} label="Humidity" value={blendedSummary.humidity_mean?.toFixed(0)} unit="%" color="#a78bfa" />
              <StatCard icon={<Gauge size={18} />} label="Pressure" value={blendedSummary.pressure_mean?.toFixed(0)} unit="hPa" color="#34d399" />
              <StatCard icon={<Cloud size={18} />} label="Cloud Cover" value={blendedSummary.cloud_cover_mean?.toFixed(0)} unit="%" color="#94a3b8" />
              {blendedSummary.cape_max != null && (
                <StatCard icon={<Zap size={18} />} label="CAPE (max)" value={blendedSummary.cape_max?.toFixed(0)} unit="J/kg" sub="Convective energy" color="#f59e0b" />
              )}
              {blendedSummary.precip_prob_max != null && (
                <StatCard icon={<Droplets size={18} />} label="Precip Prob" value={blendedSummary.precip_prob_max?.toFixed(0)} unit="%" sub="Max probability" color="#22c55e" />
              )}
            </div>
          </div>

          {/* ── Per-model comparison ── */}
          <div className="lw-section">
            <div className="section-title">
              <BarChart3 size={16} />
              Individual Model Forecasts
              {modelsUnavailable.length > 0 && (
                <span style={{ fontSize: '.72rem', color: '#ef4444', marginLeft: '.5rem' }}>
                  ({modelsUnavailable.join(', ')} data unavailable — forecast uses remaining models)
                </span>
              )}
            </div>
            <div className="models-grid">
              {Object.entries(models).map(([modelName, modelData]) => (
                <ModelCard
                  key={modelName}
                  model={modelName}
                  data={modelData}
                  weight={weights[modelName] ?? 0}
                />
              ))}
            </div>
          </div>

          {/* ── Adaptive Weights ── */}
          <div className="lw-section">
            <div className="section-title">
              <TrendingUp size={16} />
              Adaptive Model Weights (Precipitation)
            </div>
            <p style={{ fontSize: '.75rem', color: '#64748b', marginBottom: '.75rem' }}>
              Weights calculated via: <code style={{ color: '#a78bfa' }}>weight ∝ (1/MAE) × lead_decay × season_modifier × regime_modifier</code>
              — normalized so sum = 1.0. Source: literature-based MAE estimates.
            </p>
            <div className="weights-bar-list">
              {Object.entries(weights).map(([model, w]) => {
                const pct = Math.round((w as number) * 100);
                const color = MODEL_COLORS[model] ?? '#888';
                return (
                  <div key={model} className="weight-bar-item">
                    <span className="weight-bar-label" style={{ color }}>{model}</span>
                    <div className="weight-bar-track">
                      <div className="weight-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="weight-bar-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Blended Forecast ── */}
          {blended.data_available && (
            <div className="lw-section">
              <div className="section-title">
                <CheckCircle size={16} />
                HYBRID BLENDED FORECAST (24h)
                <span style={{ fontSize: '.72rem', color: '#22c55e', marginLeft: 'auto' }}>
                  Confidence: {blended.blending_confidence_pct?.toFixed(1)}%
                  | Models: {blended.models_used?.join(', ')}
                </span>
              </div>
              <div className="blended-grid">
                <div className="blended-metric">
                  <div className="blended-label">Temperature</div>
                  <div className="blended-value">{blendedSummary.temperature_mean?.toFixed(1) ?? '—'}<span className="blended-unit">°C</span></div>
                </div>
                <div className="blended-metric">
                  <div className="blended-label">Precipitation</div>
                  <div className="blended-value">{blendedSummary.precipitation_total?.toFixed(1) ?? '—'}<span className="blended-unit"> mm</span></div>
                </div>
                <div className="blended-metric">
                  <div className="blended-label">Wind Speed</div>
                  <div className="blended-value">{blendedSummary.wind_speed_mean?.toFixed(1) ?? '—'}<span className="blended-unit"> km/h</span></div>
                </div>
              </div>
              {blended.models_unavailable?.length > 0 && (
                <p style={{ fontSize: '.72rem', color: '#f97316', marginTop: '.75rem' }}>
                  ⚠ {blended.models_unavailable.join(', ')} data unavailable — weights renormalized to remaining models.
                </p>
              )}
            </div>
          )}

          {/* ── Charts ── */}
          <div className="charts-grid" style={{ marginBottom: '1rem' }}>
            {/* Model comparison bar chart */}
            <div className="chart-box">
              <div className="chart-title">Model Comparison (24h)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Object.keys(models).map(m => (
                    <Bar key={m} dataKey={m} fill={MODEL_COLORS[m] ?? '#888'} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly temperature / precipitation */}
            <div className="chart-box">
              <div className="chart-title">
                Hourly Timeline — {firstAvailable ?? 'N/A'} (next 24h)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hourlyChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="precipGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="temp" name="Temp (°C)" stroke="#f97316" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="precip" name="Precip (mm)" stroke="#22d3ee" fill="url(#precipGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Extreme Weather Signals ── */}
          <div className="lw-section">
            <div className="section-title">
              <AlertTriangle size={16} color="#f97316" />
              AI/NWP Risk Signals
              <span style={{ fontSize: '.72rem', color: '#64748b', marginLeft: '.5rem' }}>
                (NOT official government warnings)
              </span>
            </div>
            <div className="extreme-list">
              {extremes.map((sig, i) => (
                <ExtremeSignalCard key={i} signal={sig} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveWeatherForecast;
