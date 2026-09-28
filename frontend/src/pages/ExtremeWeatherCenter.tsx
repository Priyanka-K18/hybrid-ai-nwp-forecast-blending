import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  CloudRain,
  Thermometer,
  Wind,
  ShieldAlert,
  Info,
  Clock,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Radio,
  Flame,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { fetchExtremeAlerts } from '../services/api';
import { ExtremeAlert } from '../types';

// ─── 3D Perspective Tilt Card ──────────────────────────────────────────────────
const TiltCard: React.FC<{
  children: React.ReactNode;
  borderColor?: string;
  glowColor?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  borderColor = 'rgba(239, 68, 68, 0.4)',
  glowColor = 'rgba(239, 68, 68, 0.2)',
  style,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    setTilt({ x: ((y - midY) / midY) * -5, y: ((x - midX) / midX) * 5 });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setIsHovered(false); }}
      style={{
        transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? 'translateY(-3px)' : 'translateY(0)'}`,
        transition: isHovered ? 'transform 0.08s ease-out, box-shadow 0.2s ease' : 'transform 0.35s ease, box-shadow 0.35s ease',
        boxShadow: isHovered
          ? `0 16px 36px -8px ${glowColor}, 0 0 20px -2px ${glowColor}`
          : '0 8px 24px -6px rgba(0,0,0,0.5)',
        borderColor: isHovered ? borderColor : 'rgba(255,255,255,0.08)',
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'solid',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── Circular SVG Gauge ────────────────────────────────────────────────────────
const MiniGauge: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => {
  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, color: '#fff',
        }}>
          {value}%
        </div>
      </div>
      <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, fontWeight: 600 }}>{label}</span>
    </div>
  );
};

export const ExtremeWeatherCenter: React.FC = () => {
  const [alerts, setAlerts] = useState<ExtremeAlert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'Critical' | 'High' | 'Moderate'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetchExtremeAlerts()
      .then((data) => setAlerts(data))
      .catch((err) => console.error(err));
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return '#f43f5e';
      case 'High': return '#f59e0b';
      case 'Moderate': return '#eab308';
      default: return '#10b981';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'HEAVY_RAINFALL': return <CloudRain className="w-5 h-5 text-cyan-400" />;
      case 'HEAT_WAVE': return <Thermometer className="w-5 h-5 text-amber-400" />;
      case 'HIGH_WIND':
      case 'CYCLONIC': return <Wind className="w-5 h-5 text-indigo-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
  };

  const filteredAlerts = useMemo(() => {
    if (filterSeverity === 'all') return alerts;
    return alerts.filter((a) => a.risk_level === filterSeverity);
  }, [alerts, filterSeverity]);

  const handleCopyBulletin = () => {
    navigator.clipboard.writeText(JSON.stringify(alerts, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: '#f8fafc', paddingBottom: 40 }}>
      {/* ─── Mandatory IMD Decision-Support Banner ────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(127, 29, 29, 0.4) 0%, rgba(20, 10, 15, 0.6) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
      }}>
        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Meteorological Decision-Support System Notice
          </div>
          <p style={{ color: '#cbd5e1', margin: '4px 0 0 0', lineHeight: 1.5 }}>
            These automated multi-model indicators synthesize high-resolution AI/ML convective signals with 51-member ensemble spread.
            <strong style={{ color: '#fecaca' }}> They provide supplementary early guidance and do not supersede statutory warnings issued by the India Meteorological Department (IMD).</strong>
          </p>
        </div>
      </div>

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
            background: 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(245,158,11,0.2) 100%)',
            border: '1px solid rgba(244,63,94,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              background: 'linear-gradient(90deg, #ffffff 0%, #fb7185 60%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              EXTREME WEATHER GUIDANCE CENTER
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
                Multi-Hazard Convective Flash Flood, Extreme Heat & Gale Wind Trackers
              </span>
            </div>
          </div>
        </div>

        {/* Severity Filter Tabs & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', background: 'rgba(15, 23, 42, 0.9)',
            padding: 3, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)',
            gap: 4,
          }}>
            {(['all', 'Critical', 'High', 'Moderate'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: filterSeverity === sev ? 'rgba(244,63,94,0.25)' : 'transparent',
                  color: filterSeverity === sev ? '#fda4af' : '#94a3b8',
                  border: filterSeverity === sev ? '1px solid rgba(244,63,94,0.5)' : 'none',
                }}
              >
                {sev === 'all' ? 'All Signals' : sev}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyBulletin}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.1)',
              border: copied ? '1px solid #10b981' : '1px solid rgba(56,189,248,0.3)',
              color: copied ? '#34d399' : '#38bdf8',
              padding: '7px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'COPIED' : 'EXPORT BULLETIN'}
          </button>
        </div>
      </div>

      {/* ─── Active Signals Cards Grid (3D Tilt Cards) ─────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
      }}>
        {filteredAlerts.map((alert) => {
          const color = getRiskColor(alert.risk_level);
          return (
            <TiltCard
              key={alert.event_id}
              borderColor={`${color}66`}
              glowColor={`${color}33`}
              style={{ padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                {/* Event Type & Risk Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: 'rgba(15,23,42,0.9)', border: `1px solid ${color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {getEventIcon(alert.event_type)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MiniGauge value={alert.probability_pct} color={color} label="PROBABILITY" />
                    <span style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: `${color}22`, color: color, border: `1px solid ${color}55`,
                    }}>
                      {alert.risk_level.toUpperCase()} RISK
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                    SIGNAL #{alert.event_id} • T+{alert.expected_duration_hours}h WINDOW
                  </span>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: '4px 0 8px 0' }}>
                    {alert.title}
                  </h2>
                  <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                    {alert.description}
                  </p>
                </div>
              </div>

              {/* Metrics & Impacted Zones */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#94a3b8' }}>Trigger Metric:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                    {alert.expected_metric}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#94a3b8' }}>Signal Confidence:</span>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>
                    {alert.confidence_level}
                  </span>
                </div>

                {/* Impacted Regions */}
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    IMPACTED SECTORS:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {alert.affected_regions.map((reg) => (
                      <span
                        key={reg}
                        style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e2e8f0', fontWeight: 600,
                        }}
                      >
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actionable Decision Support */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}33`,
                  borderRadius: 12, padding: 12, fontSize: 11, color: '#e2e8f0', marginTop: 4,
                }}>
                  <span style={{ color: color, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                    ⚠️ Operational Decision Support:
                  </span>
                  {alert.recommended_action}
                </div>
              </div>
            </TiltCard>
          );
        })}
      </div>
    </div>
  );
};

export default ExtremeWeatherCenter;
