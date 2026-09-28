import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Cpu,
  Layers,
  Sliders,
  Sparkles,
  Info,
  Zap,
  HelpCircle,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  CloudRain,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { fetchForecast, simulateWhatIf } from '../services/api';
import { BlendedForecastResult, Region, WhatIfResponse } from '../types';

// ─── 3D Extruded Bar Component ────────────────────────────────────────────────
const ExtrudedWeightBar: React.FC<{
  label: string;
  pct: number;
  color: string;
  sub?: string;
}> = ({ label, pct, color, sub }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
      <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {sub && <span style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</span>}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color }}>
          {(pct * 100).toFixed(1)}%
        </span>
      </div>
    </div>
    <div style={{
      height: 8,
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 4,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(pct * 100, 100)}%`,
        background: `linear-gradient(90deg, ${color}66 0%, ${color} 100%)`,
        borderRadius: 3,
        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
  </div>
);

export const AdaptiveBlendingCenter: React.FC = () => {
  const { selectedRegionId, setSelectedRegionId, regions } = useOutletContext<{
    selectedRegionId: string;
    setSelectedRegionId: (id: string) => void;
    regions: Region[];
  }>();

  const [leadTime] = useState<number>(24);
  const [season] = useState<string>('Monsoon');
  const [regime] = useState<string>('Convective');
  const [forecast, setForecast] = useState<BlendedForecastResult | null>(null);

  // What-If Sliders State
  const [nwpReliability, setNwpReliability] = useState<number>(1.0);
  const [ensembleReliability, setEnsembleReliability] = useState<number>(1.0);
  const [aiReliability, setAiReliability] = useState<number>(1.0);
  const [uncertaintyLevel, setUncertaintyLevel] = useState<number>(0.5);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null);

  // Load initial blend
  useEffect(() => {
    fetchForecast(selectedRegionId, leadTime, season, regime)
      .then((data) => setForecast(data))
      .catch((err) => console.error(err));
  }, [selectedRegionId, leadTime, season, regime]);

  // Run What-If simulation
  const runSimulation = useCallback(async () => {
    try {
      const res = await simulateWhatIf({
        region_id: selectedRegionId,
        lead_time_hours: leadTime,
        season: season,
        weather_regime: regime,
        nwp_reliability_modifier: nwpReliability,
        ensemble_reliability_modifier: ensembleReliability,
        aiml_reliability_modifier: aiReliability,
        uncertainty_level: uncertaintyLevel,
      });
      setWhatIfResult(res);
    } catch (err) {
      console.error('What-if simulation error:', err);
    }
  }, [selectedRegionId, leadTime, season, regime, nwpReliability, ensembleReliability, aiReliability, uncertaintyLevel]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const activeWeights = whatIfResult
    ? whatIfResult.adjusted_weights
    : forecast
    ? forecast.model_weights
    : { nwp: 0.31, ensemble: 0.29, aiml: 0.40 };

  // Scenario Presets
  const applyPreset = (nwp: number, ens: number, ai: number, unc: number) => {
    setNwpReliability(nwp);
    setEnsembleReliability(ens);
    setAiReliability(ai);
    setUncertaintyLevel(unc);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: '#f8fafc', paddingBottom: 40 }}>
      {/* ─── Command Header ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(168,85,247,0.2) 100%)',
            border: '1px solid rgba(56,189,248,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              background: 'linear-gradient(90deg, #ffffff 0%, #38bdf8 60%, #a855f7 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              ADAPTIVE BLENDING CENTER
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                padding: '2px 7px', borderRadius: 4, background: 'rgba(56,189,248,0.15)',
                color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)',
              }}>
                CORE ENGINE
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Context-Aware Bayesian Dynamic Weight Optimization Engine
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: 10,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
          }}>
            <span style={{ color: '#94a3b8' }}>Domain:</span>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id} style={{ background: '#0f172a', color: '#fff' }}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── 5-Stage Architecture Pipeline ───────────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers className="w-4 h-4 text-cyan-400" />
            Adaptive Fusion Architecture Pipeline
          </span>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>
            5-Stage Dynamic Flow
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {/* Stage 1 */}
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 1</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>Multi-Model Ingest</div>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: '#f59e0b' }}>● NCUM / IFS (9km)</span>
              <span style={{ color: '#10b981' }}>● EPS 51-Member</span>
              <span style={{ color: '#c084fc' }}>● GraphNet Neural AI</span>
            </div>
            <span style={{ fontSize: 9, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
              Synchronized 0.1° Grid
            </span>
          </div>

          {/* Stage 2 */}
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 2</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>Contextual Vectors</div>
            </div>
            <div style={{ fontSize: 10, color: '#cbd5e1', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>• Historical MAE & Skill</span>
              <span>• Lead Time (T+{leadTime}h)</span>
              <span>• Orographic Prior</span>
              <span>• Regime: {regime}</span>
            </div>
            <span style={{ fontSize: 9, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
              Spatiotemporal State
            </span>
          </div>

          {/* Stage 3 */}
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 3</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>Weight Engine</div>
            </div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#7dd3fc', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>rel = 1/(MAE + ε)</span>
              <span>w_i = rel_i × M_ctx</span>
              <span>Σ w_i = 1.000</span>
            </div>
            <span style={{ fontSize: 9, color: '#38bdf8', borderTop: '1px solid rgba(56,189,248,0.2)', paddingTop: 6 }}>
              Non-linear Softmax
            </span>
          </div>

          {/* Stage 4 */}
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 4</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>Assigned Weights</div>
            </div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: '#f59e0b' }}>NWP: {(activeWeights.nwp * 100).toFixed(1)}%</span>
              <span style={{ color: '#10b981' }}>Ens: {(activeWeights.ensemble * 100).toFixed(1)}%</span>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>AI: {(activeWeights.aiml * 100).toFixed(1)}%</span>
            </div>
            <span style={{ fontSize: 9, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
              Dynamic Convergence
            </span>
          </div>

          {/* Stage 5 */}
          <div style={{ padding: 14, borderRadius: 14, background: 'linear-gradient(135deg, rgba(8,24,48,0.9) 0%, rgba(15,23,42,0.9) 100%)', border: '1px solid rgba(56,189,248,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 5</span>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>Blended Output</div>
            </div>
            <div style={{ fontSize: 11, color: '#e0f2fe', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>Rain: <strong>{whatIfResult ? whatIfResult.adjusted_blended_forecast.rainfall : forecast?.rainfall_mm} mm</strong></span>
              <span>Temp: <strong>{whatIfResult ? whatIfResult.adjusted_blended_forecast.temperature : forecast?.temperature_c} °C</strong></span>
              <span>Wind: <strong>{whatIfResult ? whatIfResult.adjusted_blended_forecast.wind : forecast?.wind_speed_kmh} km/h</strong></span>
            </div>
            <span style={{ fontSize: 9, color: '#34d399', fontWeight: 700, borderTop: '1px solid rgba(56,189,248,0.2)', paddingTop: 6 }}>
              ⭐ Consensus Ready
            </span>
          </div>
        </div>
      </div>

      {/* ─── What-If Scenario Simulator with Interactive Sliders ─────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 20,
        padding: '22px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders className="w-4 h-4 text-cyan-400" />
              What-If Scenario Sandbox & Dynamic Re-Balancer
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Drag reliability modifiers to simulate degradation or breakthroughs in physical or neural models
            </span>
          </div>

          {/* Quick Scenario Preset Buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => applyPreset(1.0, 1.0, 1.0, 0.5)}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              }}
            >
              Default (1.0x)
            </button>
            <button
              onClick={() => applyPreset(0.7, 1.0, 1.6, 0.4)}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', cursor: 'pointer',
              }}
            >
              ⚡ AI Convective Surge
            </button>
            <button
              onClick={() => applyPreset(1.6, 1.0, 0.6, 0.5)}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer',
              }}
            >
              🛡️ NWP Physics Anchor
            </button>
            <button
              onClick={() => applyPreset(0.8, 1.8, 0.8, 0.85)}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
              }}
            >
              🌪️ High Uncertainty Spread
            </button>
          </div>
        </div>

        {/* 4 Interactive Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {/* NWP Slider */}
          <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Physical NWP Reliability:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#f59e0b' }}>{nwpReliability.toFixed(2)}x</span>
            </div>
            <input
              type="range" min="0.2" max="2.0" step="0.05"
              value={nwpReliability}
              onChange={(e) => setNwpReliability(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', marginTop: 4 }}>
              <span>0.2x (Degraded)</span>
              <span>2.0x (Enhanced)</span>
            </div>
          </div>

          {/* Ensemble Slider */}
          <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Ensemble 51M Reliability:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#10b981' }}>{ensembleReliability.toFixed(2)}x</span>
            </div>
            <input
              type="range" min="0.2" max="2.0" step="0.05"
              value={ensembleReliability}
              onChange={(e) => setEnsembleReliability(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', marginTop: 4 }}>
              <span>0.2x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* AI/ML Slider */}
          <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>AI / ML GraphNet Reliability:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>{aiReliability.toFixed(2)}x</span>
            </div>
            <input
              type="range" min="0.2" max="2.0" step="0.05"
              value={aiReliability}
              onChange={(e) => setAiReliability(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', marginTop: 4 }}>
              <span>0.2x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* Uncertainty Slider */}
          <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Atmospheric Uncertainty:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#c084fc' }}>{(uncertaintyLevel * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0.0" max="1.0" step="0.05"
              value={uncertaintyLevel}
              onChange={(e) => setUncertaintyLevel(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', marginTop: 4 }}>
              <span>0% (Tight)</span>
              <span>100% (High Spread)</span>
            </div>
          </div>
        </div>

        {/* Live Re-Calculated Result Box */}
        {whatIfResult && (
          <div style={{
            background: 'rgba(10,16,31,0.95)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 16,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                Live Recalibrated Weights & Forecast Shift:
              </span>
              <span style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                color: whatIfResult.confidence_delta_pct >= 0 ? '#34d399' : '#f87171',
              }}>
                Confidence Shift: {whatIfResult.confidence_delta_pct >= 0 ? '+' : ''}{whatIfResult.confidence_delta_pct}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <ExtrudedWeightBar
                label="Physical NWP"
                pct={whatIfResult.adjusted_weights.nwp}
                color="#f59e0b"
                sub={`Base: ${(whatIfResult.base_weights.nwp * 100).toFixed(1)}%`}
              />
              <ExtrudedWeightBar
                label="Ensemble NWP"
                pct={whatIfResult.adjusted_weights.ensemble}
                color="#10b981"
                sub={`Base: ${(whatIfResult.base_weights.ensemble * 100).toFixed(1)}%`}
              />
              <ExtrudedWeightBar
                label="Neural Weather AI"
                pct={whatIfResult.adjusted_weights.aiml}
                color="#38bdf8"
                sub={`Base: ${(whatIfResult.base_weights.aiml * 100).toFixed(1)}%`}
              />
            </div>

            <div style={{
              marginTop: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: 11, color: '#94a3b8', fontStyle: 'italic',
            }}>
              {whatIfResult.explanation}
            </div>
          </div>
        )}
      </div>

      {/* ─── Formula & XAI Panel ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Core Formula Box */}
        <div style={{
          background: 'rgba(10, 16, 31, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 20,
          padding: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap className="w-4 h-4 text-cyan-400" />
              Dynamic Combination Equation
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8' }}>
              Σ w_i = 1.000
            </span>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: '#38bdf8',
            marginBottom: 12,
          }}>
            F_blend = {activeWeights.nwp.toFixed(3)}·F_NWP + {activeWeights.ensemble.toFixed(3)}·F_Ens + {activeWeights.aiml.toFixed(3)}·F_AI
          </div>

          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
            Coefficients dynamically scale based on non-linear inverse historical MAE, lead time decay functions, and real-time ensemble spread variance.
          </p>
        </div>

        {/* XAI Attribution */}
        <div style={{
          background: 'rgba(10, 16, 31, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 20,
          padding: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Explainable AI (XAI) Attribution
            </span>
            <span style={{ fontSize: 10, color: '#a855f7' }}>Why These Weights?</span>
          </div>

          <div style={{
            background: 'rgba(15,23,42,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 12,
            fontSize: 11,
            color: '#cbd5e1',
            lineHeight: 1.5,
            marginBottom: 10,
          }}>
            {forecast?.explanation?.summary ||
              'Neural GraphNet AI holds dominant weighting due to superior convective precipitation skill over Western Ghats in Monsoon regime.'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#94a3b8' }}>
            <span>• Topographic relief biases skill toward high-resolution neural network</span>
            <span>• T+24h lead time remains within the high-fidelity AI envelope</span>
            <span>• Hydrostatic NWP maintains mass and temperature continuity constraints</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveBlendingCenter;
