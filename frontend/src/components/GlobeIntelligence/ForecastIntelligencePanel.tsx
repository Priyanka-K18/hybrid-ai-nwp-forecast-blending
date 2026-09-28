/**
 * ForecastIntelligencePanel.tsx
 * Side panel shown when a country/location is selected on the globe.
 * Displays: hybrid forecast, adaptive weights, regime, model comparison,
 * extreme-weather signals, and drill-down breadcrumb.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, GitMerge, AlertTriangle, BarChart3, ChevronRight,
  TrendingUp, Zap, Thermometer, Droplets, Wind, Activity,
  CheckCircle2, RefreshCw, ExternalLink, Compass, Clock,
} from 'lucide-react';

export interface LocationBreadcrumb {
  world?: string;
  continent?: string;
  country?: string;
  state?: string;
  city?: string;
}

export interface ForecastIntelligenceData {
  location: LocationBreadcrumb;
  latitude: number;
  longitude: number;
  temperature_c?: number;
  rainfall_mm?: number;
  wind_speed_kmh?: number;
  humidity_pct?: number;
  pressure_hpa?: number;
  regime?: string;
  regime_confidence?: number;
  confidence_pct?: number;
  confidence_level?: string;
  risk_level?: string;
  is_extreme?: boolean;
  extreme_signals?: string[];
  weights?: { ecmwf: number; gfs: number; icon: number; ai: number };
  model_disagreement?: 'LOW' | 'MEDIUM' | 'HIGH';
  model_values?: { ecmwf: number; gfs: number; icon: number; ai: number };
  hybrid_rainfall?: number;
  is_demo?: boolean;
  error?: string;
}

interface Props {
  data: ForecastIntelligenceData | null;
  loading: boolean;
  onClose?: () => void;
  onDrillDown?: (level: 'country' | 'state' | 'city', name: string) => void;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const REGIME_COLOR: Record<string, string> = {
  'Heavy Rain':   '#38bdf8', 'Extreme Rain': '#f87171',
  'Heat Wave':    '#fb923c', 'High Wind':    '#a78bfa',
  'Convective':   '#fbbf24', 'Storm':        '#f87171',
  'Normal':       '#34d399', 'Dry':          '#94a3b8',
};

const RISK_COLOR: Record<string, string> = {
  'Low': '#34d399', 'Moderate': '#fbbf24', 'High': '#fb923c', 'Critical': '#f87171',
};

function rgbStr(hex: string): string {
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '56,189,248';
}

function WeightBar({ label, pct, color, delay = 0 }: { label: string; pct: number; color: string; delay?: number }) {
  const [w, setW] = React.useState(0);
  React.useEffect(() => { const t = setTimeout(() => setW(pct), 80 + delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'monospace' }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${w}%`, borderRadius: 3,
          background: `linear-gradient(90deg,${color}44,${color})`,
          boxShadow: `0 0 8px ${color}66`,
          transition: `width 0.8s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export const ForecastIntelligencePanel: React.FC<Props> = ({ data, loading, onClose }) => {
  const navigate = useNavigate();
  const rc  = REGIME_COLOR[data?.regime ?? ''] ?? '#38bdf8';
  const rlc = RISK_COLOR[data?.risk_level ?? 'Low'] ?? '#34d399';

  return (
    <>
      <style>{`
        @keyframes panelSlide {
          from { opacity:0; transform:translateX(24px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes shimmer {
          0%{background-position:200% 0} 100%{background-position:-200% 0}
        }
        @keyframes pulseR {
          0%,100%{opacity:1} 50%{opacity:0.4}
        }
      `}</style>

      <div style={{
        width: 340,
        background: 'rgba(7,11,20,0.88)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(56,189,248,0.22)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 16px 64px rgba(0,0,0,0.7)',
        animation: 'panelSlide 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 180px)',
      }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(56,189,248,0.12) 0%,rgba(99,102,241,0.08) 100%)',
          borderBottom: '1px solid rgba(56,189,248,0.15)',
          padding: '16px 18px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {['world', 'continent', 'country', 'state', 'city'].map((k, i) => {
                  const val = (data?.location as any)?.[k];
                  if (!val) return null;
                  return (
                    <React.Fragment key={k}>
                      {i > 0 && <ChevronRight style={{ width: 10, height: 10, color: '#475569' }} />}
                      <span style={{
                        fontSize: 9, color: k === 'city' ? '#38bdf8' : '#64748b',
                        fontWeight: k === 'city' ? 800 : 500, fontFamily: 'monospace',
                      }}>{val}</span>
                    </React.Fragment>
                  );
                })}
              </div>

              <div style={{
                fontSize: 18, fontWeight: 900, color: '#f8fafc',
                letterSpacing: '-0.01em', lineHeight: 1.2,
              }}>
                {loading ? (
                  <div style={{ height: 22, width: 160, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                ) : (
                  data?.location?.city || data?.location?.country || '—'
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {data?.regime && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: '0.09em',
                    padding: '3px 8px', borderRadius: 5,
                    background: `rgba(${rgbStr(rc)},0.15)`,
                    border: `1px solid rgba(${rgbStr(rc)},0.35)`,
                    color: rc,
                  }}>{data.regime.toUpperCase()}</span>
                )}
                {data?.risk_level && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: '0.09em',
                    padding: '3px 8px', borderRadius: 5,
                    background: `rgba(${rgbStr(rlc)},0.12)`,
                    border: `1px solid rgba(${rgbStr(rlc)},0.3)`,
                    color: rlc,
                  }}>RISK: {data.risk_level.toUpperCase()}</span>
                )}
                {data?.is_demo && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.09em',
                    padding: '3px 8px', borderRadius: 5,
                    background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)',
                    color: '#fbbf24',
                  }}>DEMO</span>
                )}
              </div>
            </div>

            {onClose && (
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>✕</button>
            )}
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Error state */}
          {data?.error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)',
              fontSize: 11, color: '#fca5a5',
            }}>
              ⚠ {data.error}
            </div>
          )}

          {/* ── Forecast Overview ─────────────────────────────────────────── */}
          <Section title="Forecast Overview" icon={<Activity style={{ width: 13, height: 13 }} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: <Thermometer style={{ width: 14, height: 14 }} />, label: 'Temperature', val: data?.temperature_c !== undefined ? `${data.temperature_c.toFixed(1)}°C` : null, col: '#fb923c' },
                { icon: <Droplets style={{ width: 14, height: 14 }} />, label: 'Rainfall', val: data?.rainfall_mm !== undefined ? `${data.rainfall_mm.toFixed(1)} mm` : null, col: '#38bdf8' },
                { icon: <Wind style={{ width: 14, height: 14 }} />, label: 'Wind', val: data?.wind_speed_kmh !== undefined ? `${data.wind_speed_kmh.toFixed(0)} km/h` : null, col: '#a78bfa' },
                { icon: <Droplets style={{ width: 14, height: 14 }} />, label: 'Humidity', val: data?.humidity_pct !== undefined ? `${data.humidity_pct.toFixed(0)}%` : null, col: '#34d399' },
              ].map(m => (
                <MiniMetric key={m.label} {...m} loading={loading} />
              ))}
            </div>
          </Section>

          {/* ── Confidence ──────────────────────────────────────────────── */}
          {(data?.confidence_pct !== undefined || loading) && (
            <Section title="Blend Confidence" icon={<CheckCircle2 style={{ width: 13, height: 13 }} />}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: `conic-gradient(#38bdf8 ${(data?.confidence_pct ?? 0) * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'rgba(7,11,20,0.95)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace',
                  }}>
                    {loading ? '…' : `${(data?.confidence_pct ?? 0).toFixed(0)}%`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                    {data?.confidence_level ?? 'CALCULATING'}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    Blend confidence tier
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* ── Adaptive Model Weights ───────────────────────────────────── */}
          <Section title="Model Contribution" icon={<Brain style={{ width: 13, height: 13 }} />}>
            {data?.weights ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <WeightBar label="ECMWF"  pct={data.weights.ecmwf * 100} color="#38bdf8" delay={0}   />
                <WeightBar label="GFS"    pct={data.weights.gfs   * 100} color="#a78bfa" delay={80}  />
                <WeightBar label="ICON"   pct={data.weights.icon  * 100} color="#fb923c" delay={160} />
                <WeightBar label="AI/ML"  pct={data.weights.ai    * 100} color="#34d399" delay={240} />
                {/* sum check */}
                <div style={{
                  fontSize: 9, color: '#475569', textAlign: 'right',
                  fontFamily: 'monospace', marginTop: 2,
                }}>
                  Σ = {((data.weights.ecmwf + data.weights.gfs + data.weights.icon + data.weights.ai) * 100).toFixed(1)}%
                </div>
              </div>
            ) : loading ? (
              <Shimmer lines={4} />
            ) : (
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>
                Adaptive weights unavailable — insufficient validation data
              </div>
            )}
          </Section>

          {/* ── Model Disagreement ──────────────────────────────────────── */}
          {data?.model_disagreement && (
            <Section title="Model Disagreement" icon={<GitMerge style={{ width: 13, height: 13 }} />}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 7,
                  fontFamily: 'monospace',
                  background: data.model_disagreement === 'HIGH' ? 'rgba(248,113,113,0.15)' : data.model_disagreement === 'MEDIUM' ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.15)',
                  border: `1px solid ${data.model_disagreement === 'HIGH' ? 'rgba(248,113,113,0.35)' : data.model_disagreement === 'MEDIUM' ? 'rgba(251,191,36,0.35)' : 'rgba(52,211,153,0.35)'}`,
                  color: data.model_disagreement === 'HIGH' ? '#f87171' : data.model_disagreement === 'MEDIUM' ? '#fbbf24' : '#34d399',
                }}>{data.model_disagreement}</span>
                {data.model_values && (
                  <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
                    ECMWF {data.model_values.ecmwf.toFixed(0)}mm · GFS {data.model_values.gfs.toFixed(0)}mm<br />
                    ICON {data.model_values.icon.toFixed(0)}mm · AI {data.model_values.ai.toFixed(0)}mm
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ── Hybrid Forecast ─────────────────────────────────────────── */}
          {data?.hybrid_rainfall !== undefined && (
            <Section title="Hybrid Forecast Output" icon={<GitMerge style={{ width: 13, height: 13 }} />}>
              <div style={{
                background: 'linear-gradient(135deg,rgba(56,189,248,0.10) 0%,rgba(99,102,241,0.08) 100%)',
                border: '1px solid rgba(56,189,248,0.20)', borderRadius: 12, padding: '12px 14px',
                fontFamily: 'monospace',
              }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Blended Precipitation</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>
                  {data.hybrid_rainfall.toFixed(1)}
                  <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500, marginLeft: 4 }}>mm</span>
                </div>
                <div style={{ fontSize: 9, color: '#475569', marginTop: 6 }}>
                  F<sub>blend</sub> = w<sub>NWP</sub>·F<sub>ECMWF</sub> + w<sub>ENS</sub>·F<sub>GFS</sub> + w<sub>AI</sub>·F<sub>ML</sub>
                </div>
              </div>
            </Section>
          )}

          {/* ── Extreme Weather ─────────────────────────────────────────── */}
          {(data?.is_extreme || (data?.extreme_signals && data.extreme_signals.length > 0)) && (
            <Section title="AI/NWP Risk Signals" icon={<AlertTriangle style={{ width: 13, height: 13, color: '#f87171' }} />} accent="#f87171">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data?.extreme_signals?.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.22)',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', flexShrink: 0, animation: 'pulseR 1.4s ease infinite' }} />
                    <span style={{ fontSize: 11, color: '#fca5a5' }}>{s}</span>
                  </div>
                ))}
                <div style={{
                  fontSize: 9, color: '#64748b', fontStyle: 'italic', marginTop: 2,
                }}>
                  AI/NWP Risk Signal — not an official government warning.
                </div>
              </div>
            </Section>
          )}

          {/* ── Operational Run & Resolution ─────────────────────────────── */}
          <Section title="Operational Telemetry" icon={<Clock style={{ width: 13, height: 13 }} />}>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '10px 12px', fontSize: 10, color: '#94a3b8',
              display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'monospace',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>SYNOPTIC CYCLE:</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>12Z OPERATIONAL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>FORECAST HORIZON:</span>
                <span style={{ color: '#f8fafc', fontWeight: 700 }}>T+24H BLEND</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>ACTIVE NWP/AI:</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>ECMWF · GFS · ICON · AI</span>
              </div>
            </div>
          </Section>

          {/* ── Deep Dive Actions ────────────────────────────────────────── */}
          <Section title="Deep Dive Analytics" icon={<Compass style={{ width: 13, height: 13 }} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => navigate('/live-weather')}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  background: 'linear-gradient(135deg,rgba(56,189,248,0.14) 0%,rgba(99,102,241,0.12) 100%)',
                  border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8',
                  fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)')}
              >
                <span>Live Multi-Model Forecast Explorer</span>
                <ExternalLink style={{ width: 12, height: 12 }} />
              </button>

              <button
                onClick={() => navigate('/adaptive-blending')}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8',
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <span>Adaptive Weight Matrix</span>
                <ExternalLink style={{ width: 12, height: 12 }} />
              </button>

              <button
                onClick={() => navigate('/extreme-weather')}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8',
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <span>Extreme Weather Intelligence Center</span>
                <ExternalLink style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </Section>

          {/* ── Coordinates ─────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 9, color: '#334155', fontFamily: 'monospace', paddingTop: 6,
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span>φ {data?.latitude?.toFixed(4) ?? '—'}°</span>
            <span>λ {data?.longitude?.toFixed(4) ?? '—'}°</span>
          </div>

        </div>
      </div>
    </>
  );
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string }> = ({ title, icon, children, accent = '#38bdf8' }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <span style={{ color: accent }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</span>
    </div>
    {children}
  </div>
);

const MiniMetric: React.FC<{ icon: React.ReactNode; label: string; val: string | null; col: string; loading: boolean }> = ({ icon, label, val, col, loading }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10, padding: '10px 12px',
  }}>
    <div style={{ color: col, marginBottom: 4 }}>{icon}</div>
    {loading ? (
      <div style={{ height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }} />
    ) : (
      <div style={{ fontSize: 15, fontWeight: 800, color: col, fontFamily: 'monospace', lineHeight: 1 }}>
        {val ?? '—'}
      </div>
    )}
    <div style={{ fontSize: 9, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
  </div>
);

const Shimmer: React.FC<{ lines: number }> = ({ lines }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {Array.from({ length: lines }, (_, i) => (
      <div key={i} style={{
        height: 10, borderRadius: 4,
        background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        width: `${80 - i * 8}%`,
      }} />
    ))}
  </div>
);
