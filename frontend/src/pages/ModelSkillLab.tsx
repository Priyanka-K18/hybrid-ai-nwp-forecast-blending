import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart3,
  Award,
  Layers,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sliders,
  Copy,
  Check,
  Zap,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { fetchModelSkill } from '../services/api';
import { ModelSkillResponse, Region } from '../types';

export const ModelSkillLab: React.FC = () => {
  const { selectedRegionId, setSelectedRegionId, regions } = useOutletContext<{
    selectedRegionId: string;
    setSelectedRegionId: (id: string) => void;
    regions: Region[];
  }>();

  const [variable, setVariable] = useState<string>('rainfall');
  const [season, setSeason] = useState<string>('Monsoon');
  const [leadTime, setLeadTime] = useState<number>(24);
  const [regime, setRegime] = useState<string>('Convective');
  const [skillReport, setSkillReport] = useState<ModelSkillResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetchModelSkill('aiml', variable, selectedRegionId, season, leadTime, regime)
      .then((data) => setSkillReport(data))
      .catch((err) => console.error(err));
  }, [selectedRegionId, variable, season, leadTime, regime]);

  const handleCopyMetrics = () => {
    if (!skillReport) return;
    navigator.clipboard.writeText(JSON.stringify(skillReport, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(16,185,129,0.2) 100%)',
            border: '1px solid rgba(56,189,248,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              background: 'linear-gradient(90deg, #ffffff 0%, #38bdf8 60%, #10b981 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              MODEL SKILL LAB & VERIFICATION
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                padding: '2px 7px', borderRadius: 4, background: 'rgba(251,191,36,0.12)',
                color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)',
              }}>
                DEMO DATA
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                WMO Standard Verification Metrics • MAE, RMSE, CRPS, Brier Score, CSI & FAR
              </span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={variable}
            onChange={(e) => setVariable(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              color: '#38bdf8',
              fontWeight: 600,
              outline: 'none',
            }}
          >
            <option value="rainfall">🌧️ Rainfall</option>
            <option value="temperature">🌡️ Temperature</option>
            <option value="wind">💨 Wind Speed</option>
          </select>

          <select
            value={leadTime}
            onChange={(e) => setLeadTime(Number(e.target.value))}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              color: '#38bdf8',
              fontWeight: 600,
              outline: 'none',
            }}
          >
            <option value={6}>T+6h Horizon</option>
            <option value={12}>T+12h Horizon</option>
            <option value={24}>T+24h Horizon</option>
            <option value={48}>T+48h Horizon</option>
            <option value={72}>T+72h Horizon</option>
            <option value={120}>T+120h Horizon</option>
          </select>

          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              color: '#38bdf8',
              fontWeight: 600,
              outline: 'none',
            }}
          >
            <option value="Monsoon">Monsoon</option>
            <option value="Summer">Summer</option>
            <option value="Winter">Winter</option>
            <option value="Post-Monsoon">Post-Monsoon</option>
          </select>

          <button
            onClick={handleCopyMetrics}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.1)',
              border: copied ? '1px solid #10b981' : '1px solid rgba(56,189,248,0.3)',
              color: copied ? '#34d399' : '#38bdf8',
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'COPIED' : 'EXPORT'}
          </button>
        </div>
      </div>

      {/* ─── Verification Benchmark KPI Strip ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
      }}>
        <div style={{
          background: 'rgba(10, 16, 31, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>MAE Empirical Lift</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: '#34d399' }}>-18.4%</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>vs Raw NWP</span>
          </div>
          <span style={{ fontSize: 10, color: '#64748b' }}>Mean absolute error reduction</span>
        </div>

        <div style={{
          background: 'rgba(10, 16, 31, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Probabilistic CRPS</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: '#38bdf8' }}>2.14</span>
            <span style={{ fontSize: 10, color: '#34d399' }}>↓ Best</span>
          </div>
          <span style={{ fontSize: 10, color: '#64748b' }}>Continuous Ranked Prob Score</span>
        </div>

        <div style={{
          background: 'rgba(10, 16, 31, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Critical Success Index (CSI)</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: '#c084fc' }}>0.742</span>
            <span style={{ fontSize: 10, color: '#34d399' }}>↑ Superior</span>
          </div>
          <span style={{ fontSize: 10, color: '#64748b' }}>Threat score for &gt;25mm events</span>
        </div>

        <div style={{
          background: 'rgba(10, 16, 31, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>False Alarm Ratio (FAR)</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: '#fbbf24' }}>0.118</span>
            <span style={{ fontSize: 10, color: '#34d399' }}>↓ Minimal</span>
          </div>
          <span style={{ fontSize: 10, color: '#64748b' }}>Reduced spurious rainfall triggers</span>
        </div>
      </div>

      {/* ─── Model Verification Matrix Table ─────────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award className="w-4 h-4 text-cyan-400" />
            Comprehensive Model Verification Leaderboard
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
            Region: {selectedRegionId.toUpperCase()} • T+{leadTime}h
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11 }}>
              <th style={{ padding: '10px 12px' }}>Rank</th>
              <th style={{ padding: '10px 12px' }}>Forecasting Model</th>
              <th style={{ padding: '10px 12px', color: '#38bdf8' }}>MAE ↓</th>
              <th style={{ padding: '10px 12px' }}>RMSE ↓</th>
              <th style={{ padding: '10px 12px' }}>Bias (Mean)</th>
              <th style={{ padding: '10px 12px' }}>CRPS ↓</th>
              <th style={{ padding: '10px 12px' }}>Brier Score ↓</th>
              <th style={{ padding: '10px 12px', color: '#34d399' }}>CSI ↑</th>
              <th style={{ padding: '10px 12px' }}>POD ↑</th>
              <th style={{ padding: '10px 12px' }}>FAR ↓</th>
            </tr>
          </thead>
          <tbody style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {skillReport?.metrics.map((m) => {
              const isBlend = m.model_id === 'blended';
              return (
                <tr
                  key={m.model_id}
                  style={{
                    background: isBlend ? 'rgba(56,189,248,0.1)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-flex', width: 22, height: 22, borderRadius: '50%',
                      background: m.rank === 1 ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                      color: m.rank === 1 ? '#070b14' : '#fff',
                      fontSize: 10, fontWeight: 800, alignItems: 'center', justifyContent: 'center',
                    }}>
                      #{m.rank}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'sans-serif', fontWeight: 700, color: isBlend ? '#38bdf8' : '#f8fafc' }}>
                    {m.model_name}
                  </td>
                  <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 800 }}>{m.mae.toFixed(2)}</td>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>{m.rmse.toFixed(2)}</td>
                  <td style={{ padding: '12px', color: m.bias > 0 ? '#f87171' : '#60a5fa' }}>
                    {m.bias > 0 ? `+${m.bias}` : m.bias}
                  </td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>{m.crps.toFixed(2)}</td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>{m.brier_score.toFixed(3)}</td>
                  <td style={{ padding: '12px', color: '#34d399', fontWeight: 800 }}>{m.csi.toFixed(3)}</td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>{m.pod.toFixed(3)}</td>
                  <td style={{ padding: '12px', color: '#f59e0b' }}>{m.far.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 10, color: '#64748b', marginTop: 12, paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span>↓ Lower is better (MAE, RMSE, CRPS, Brier, FAR) • ↑ Higher is better (CSI, POD)</span>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>Adaptive Blended consensus maintains #1 ranking</span>
        </div>
      </div>

      {/* ─── Verification Dual Charts ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18 }}>
        {/* Error Growth by Lead Time */}
        <div style={{
          background: 'rgba(10, 16, 31, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 20, padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              Error Growth by Horizon (MAE)
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8' }}>6h → 120h</span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={skillReport?.skill_by_lead_time || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="lead_time" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(10, 16, 31, 0.95)', borderColor: '#38bdf8', borderRadius: 8, fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="NWP" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Ensemble" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="AI_ML" stroke="#c084fc" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Blended" stroke="#38bdf8" strokeWidth={3.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 14-Day Rolling Error Trend */}
        <div style={{
          background: 'rgba(10, 16, 31, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 20, padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              14-Day Verification Error Trend
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8' }}>Daily Residuals</span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={skillReport?.error_trend || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(10, 16, 31, 0.95)', borderColor: '#38bdf8', borderRadius: 8, fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="NWP" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Ensemble" stroke="#10b981" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="AI_ML" stroke="#c084fc" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Blended" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSkillLab;
