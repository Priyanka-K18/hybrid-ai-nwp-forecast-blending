import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Compass,
  Layers,
  CloudRain,
  Thermometer,
  Wind,
  Gauge,
  Info,
  CheckCircle2,
  TrendingUp,
  Zap,
  Activity,
  Sparkles,
  Clock,
  ShieldAlert,
  Sliders,
  Copy,
  Check,
  ChevronRight,
  Eye,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
} from 'recharts';
import { fetchForecast } from '../services/api';
import { BlendedForecastResult, Region, ModelContribution } from '../types';

// ─── Circular SVG Gauge ────────────────────────────────────────────────────────
interface CircularGaugeProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  color?: string;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  size = 110,
  strokeWidth = 9,
  label,
  sublabel,
  color = '#38bdf8',
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Animated active bar */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 6px ${color}88)`,
            }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: size < 100 ? 16 : 20,
            fontWeight: 800,
            color: 'white',
            lineHeight: 1,
          }}>
            {value.toFixed(0)}%
          </span>
          {sublabel && (
            <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 3, letterSpacing: '0.04em' }}>
              {sublabel}
            </span>
          )}
        </div>
      </div>
      <span style={{
        marginTop: 6, fontSize: 11, fontWeight: 600, color: '#cbd5e1',
        letterSpacing: '0.03em', textAlign: 'center',
      }}>
        {label}
      </span>
    </div>
  );
};

// ─── 3D Perspective Tilt Card ──────────────────────────────────────────────────
interface TiltCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  borderColor?: string;
  glowColor?: string;
}

const TiltCard: React.FC<TiltCardProps> = ({
  children,
  style,
  borderColor = 'rgba(56,189,248,0.2)',
  glowColor = 'rgba(56,189,248,0.15)',
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
    const tiltX = ((y - midY) / midY) * -5;
    const tiltY = ((x - midX) / midX) * 5;
    setTilt({ x: tiltX, y: tiltY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? 'translateY(-3px)' : 'translateY(0)'}`,
        transition: isHovered ? 'transform 0.08s ease-out, box-shadow 0.2s ease' : 'transform 0.35s ease, box-shadow 0.35s ease',
        boxShadow: isHovered
          ? `0 16px 36px -8px ${glowColor}, 0 0 20px -2px ${glowColor}`
          : '0 8px 24px -6px rgba(0,0,0,0.5)',
        borderColor: isHovered ? borderColor : 'rgba(255,255,255,0.08)',
        background: 'rgba(10, 16, 31, 0.72)',
        backdropFilter: 'blur(16px)',
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'solid',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── 3D Extruded Bar Component ────────────────────────────────────────────────
const ExtrudedWeightBar: React.FC<{
  label: string;
  pct: number;
  color: string;
  icon?: string;
  detail?: string;
}> = ({ label, pct, color, icon, detail }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
      <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon && <span>{icon}</span>}
        {label}
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {detail && <span style={{ fontSize: 10, color: '#94a3b8' }}>{detail}</span>}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color }}>
          {(pct * 100).toFixed(1)}%
        </span>
      </div>
    </div>
    <div style={{
      height: 8,
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 4,
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(pct * 100, 100)}%`,
        background: `linear-gradient(90deg, ${color}66 0%, ${color} 100%)`,
        borderRadius: 3,
        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: `0 0 10px ${color}88`,
      }} />
    </div>
  </div>
);

// ─── Forecast Explorer Main Component ──────────────────────────────────────────
export const ForecastExplorer: React.FC = () => {
  const { selectedRegionId, setSelectedRegionId, regions } = useOutletContext<{
    selectedRegionId: string;
    setSelectedRegionId: (id: string) => void;
    regions: Region[];
  }>();

  const [variable, setVariable] = useState<'rainfall' | 'temperature' | 'wind'>('rainfall');
  const [leadTime, setLeadTime] = useState<number>(24);
  const [season, setSeason] = useState<string>('Monsoon');
  const [regime, setRegime] = useState<string>('Convective');
  const [forecast, setForecast] = useState<BlendedForecastResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'trajectory' | 'dispersion' | 'matrix'>('trajectory');

  // Load forecast data on filter change
  useEffect(() => {
    setLoading(true);
    fetchForecast(selectedRegionId, leadTime, season, regime)
      .then((data) => setForecast(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedRegionId, leadTime, season, regime]);

  // Selected region metadata
  const currentRegion = useMemo(() => {
    return regions.find((r) => r.id === selectedRegionId) || {
      id: selectedRegionId,
      name: selectedRegionId.charAt(0).toUpperCase() + selectedRegionId.slice(1),
      zone: 'Regional Domain',
      lat: 15.31,
      lon: 75.71,
    };
  }, [regions, selectedRegionId]);

  // Lead times for multi-horizon progression (6h to 120h)
  const leadTimes = [6, 12, 24, 48, 72, 120];

  const trajectoryData = useMemo(() => {
    const baseRain = forecast ? forecast.rainfall_mm : 46.2;
    const baseTemp = forecast ? forecast.temperature_c : 28.4;
    const baseWind = forecast ? forecast.wind_speed_kmh : 26.5;

    let targetBase = baseRain;
    if (variable === 'temperature') targetBase = baseTemp;
    if (variable === 'wind') targetBase = baseWind;

    return leadTimes.map((lt) => {
      const step = (lt - 24) / 24;
      // Dynamic lead-time divergence simulation
      const nwpVal = Number((targetBase * (0.91 + step * 0.04)).toFixed(1));
      const ensVal = Number((targetBase * (1.03 - step * 0.02)).toFixed(1));
      const aiVal = Number((targetBase * (1.09 - step * 0.05)).toFixed(1));

      // Weight dynamic shift with lead time (AI dominates early, NWP gains at Day 5)
      const wAi = Math.max(0.18, 0.45 - step * 0.06);
      const wNwp = Math.min(0.48, 0.22 + step * 0.07);
      const wEns = 1.0 - (wAi + wNwp);

      const blendVal = Number((nwpVal * wNwp + ensVal * wEns + aiVal * wAi).toFixed(1));
      const spread = Math.abs(aiVal - nwpVal) * 0.65 + 3.0;

      return {
        lead_time: `T+${lt}h`,
        rawLt: lt,
        NWP: nwpVal,
        Ensemble: ensVal,
        AI_ML: aiVal,
        Blended: blendVal,
        // Confidence Envelope
        ConfidenceUpper: Number((blendVal + spread * 1.5).toFixed(1)),
        ConfidenceLower: Number(Math.max(0, blendVal - spread * 1.5).toFixed(1)),
        Confidence80Upper: Number((blendVal + spread * 0.9).toFixed(1)),
        Confidence80Lower: Number(Math.max(0, blendVal - spread * 0.9).toFixed(1)),
      };
    });
  }, [forecast, variable]);

  // Unit and label configuration
  const unit = variable === 'rainfall' ? 'mm' : variable === 'temperature' ? '°C' : 'km/h';
  const varTitle = variable === 'rainfall' ? 'Rainfall' : variable === 'temperature' ? 'Temperature' : 'Wind Speed';

  // 51 simulated ensemble members around current blended value
  const ensembleMembers = useMemo(() => {
    const center = forecast
      ? (variable === 'rainfall' ? forecast.rainfall_mm : variable === 'temperature' ? forecast.temperature_c : forecast.wind_speed_kmh)
      : 45.0;
    const stdDev = center * 0.16;

    // Seeded pseudo-random 51 members
    return Array.from({ length: 51 }, (_, i) => {
      // Box-Muller approx
      const u1 = (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
      const u2 = (Math.cos(i * 93.9898 + 41.233) * 23758.5453) % 1;
      const randNormal = Math.sqrt(-2.0 * Math.log(Math.abs(u1) + 0.001)) * Math.cos(2.0 * Math.PI * Math.abs(u2));
      const val = Math.max(0, center + randNormal * stdDev * (0.8 + (i % 7) * 0.05));
      return {
        id: i + 1,
        value: Number(val.toFixed(1)),
        isOutlier: Math.abs(val - center) > stdDev * 1.9,
      };
    }).sort((a, b) => a.value - b.value);
  }, [forecast, variable]);

  // Model contributions lookup
  const nwpContrib = forecast?.model_contributions.find((c) => c.model_type === 'NWP');
  const ensContrib = forecast?.model_contributions.find((c) => c.model_type === 'Ensemble');
  const aiContrib = forecast?.model_contributions.find((c) => c.model_type === 'AI_ML');

  const getNwpVal = () => (nwpContrib ? (variable === 'rainfall' ? nwpContrib.rainfall_mm : variable === 'temperature' ? nwpContrib.temperature_c : nwpContrib.wind_speed_kmh) : 0);
  const getEnsVal = () => (ensContrib ? (variable === 'rainfall' ? ensContrib.rainfall_mm : variable === 'temperature' ? ensContrib.temperature_c : ensContrib.wind_speed_kmh) : 0);
  const getAiVal = () => (aiContrib ? (variable === 'rainfall' ? aiContrib.rainfall_mm : variable === 'temperature' ? aiContrib.temperature_c : aiContrib.wind_speed_kmh) : 0);
  const getBlendVal = () => (forecast ? (variable === 'rainfall' ? forecast.rainfall_mm : variable === 'temperature' ? forecast.temperature_c : forecast.wind_speed_kmh) : 0);

  const blendVal = getBlendVal();
  const nwpVal = getNwpVal();
  const ensVal = getEnsVal();
  const aiVal = getAiVal();

  // Model delta from blended consensus
  const nwpDelta = Number((nwpVal - blendVal).toFixed(1));
  const ensDelta = Number((ensVal - blendVal).toFixed(1));
  const aiDelta = Number((aiVal - blendVal).toFixed(1));

  // Copy JSON payload
  const handleCopyPayload = () => {
    if (!forecast) return;
    navigator.clipboard.writeText(JSON.stringify(forecast, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: '#f8fafc', paddingBottom: 40 }}>
      {/* ─── Mission Control Command Header ───────────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(168,85,247,0.2) 100%)',
                border: '1px solid rgba(56,189,248,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 15px rgba(56,189,248,0.3)',
              }}>
                <Compass className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 style={{
                  fontSize: 20, fontWeight: 800, margin: 0,
                  background: 'linear-gradient(90deg, #ffffff 0%, #38bdf8 60%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.02em',
                }}>
                  MULTI-MODEL FORECAST EXPLORER
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span style={{
                    fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                    padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.3)',
                  }}>
                    DEMO DATA
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    Multi-Model Ensemble Synthesis • ECMWF IFS, NCUM-G, EPS-51 & Neural GraphNet
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Synoptic Cycle Badges & Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(56,189,248,0.25)',
              borderRadius: 10,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                display: 'inline-block',
              }} />
              <span style={{ color: '#94a3b8' }}>CYCLE:</span>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>06Z RUN</span>
              <span style={{ color: '#475569' }}>|</span>
              <span style={{ color: '#94a3b8' }}>REGIME:</span>
              <span style={{ color: '#a855f7', fontWeight: 700 }}>{regime.toUpperCase()}</span>
            </div>

            <button
              onClick={handleCopyPayload}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.1)',
                border: copied ? '1px solid #10b981' : '1px solid rgba(56,189,248,0.3)',
                color: copied ? '#34d399' : '#38bdf8',
                padding: '7px 14px', borderRadius: 10,
                fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Copy Forecast JSON telemetry"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'COPIED' : 'EXPORT JSON'}
            </button>
          </div>
        </div>

        {/* ─── Control Bar Grid (Region, Variable, Horizon, Season, Regime) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Region Selector */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Region / State
            </label>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                color: '#38bdf8',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.zone})
                </option>
              ))}
            </select>
          </div>

          {/* Meteorological Variable Selector */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Variable
            </label>
            <select
              value={variable}
              onChange={(e) => setVariable(e.target.value as any)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                color: '#38bdf8',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="rainfall">🌧️ Rainfall (mm)</option>
              <option value="temperature">🌡️ Temperature (°C)</option>
              <option value="wind">💨 Wind Speed (km/h)</option>
            </select>
          </div>

          {/* Lead Horizon Selector */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Lead Horizon
            </label>
            <select
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                color: '#38bdf8',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value={6}>T+6 Hours (Nowcast)</option>
              <option value={12}>T+12 Hours (Half-Day)</option>
              <option value={24}>T+24 Hours (Day 1 Synoptic)</option>
              <option value={48}>T+48 Hours (Day 2 Synoptic)</option>
              <option value={72}>T+72 Hours (Day 3 Medium)</option>
              <option value={120}>T+120 Hours (Day 5 Medium)</option>
            </select>
          </div>

          {/* Season Selector */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Synoptic Season
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                color: '#38bdf8',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="Monsoon">Monsoon (JJAS)</option>
              <option value="Summer">Summer / Pre-Monsoon</option>
              <option value="Winter">Winter (JF)</option>
              <option value="Post-Monsoon">Post-Monsoon (OND)</option>
            </select>
          </div>

          {/* Weather Regime */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Atmospheric Regime
            </label>
            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                color: '#38bdf8',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="Normal">Normal / Barotropic</option>
              <option value="Convective">Convective Instability</option>
              <option value="Heavy Rain">Heavy Precipitation Event</option>
              <option value="Heat Wave">Heat Wave / High Z500</option>
              <option value="High Wind">Gale Wind / Boundary Shear</option>
              <option value="Cyclonic">Tropical Low / Cyclonic</option>
            </select>
          </div>
        </div>

        {/* ─── Interactive Lead Time Timeline Horizon Scrubber ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: '8px 14px',
          gap: 8,
          overflowX: 'auto',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            HORIZON:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {leadTimes.map((lt) => {
              const isActive = leadTime === lt;
              return (
                <button
                  key={lt}
                  onClick={() => setLeadTime(lt)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isActive
                      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      : 'rgba(255,255,255,0.04)',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isActive ? '0 0 12px rgba(56,189,248,0.4)' : 'none',
                  }}
                >
                  +{lt}h
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
            <span>Target:</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#38bdf8', fontWeight: 700 }}>
              +{leadTime}h Valid Time
            </span>
          </div>
        </div>
      </div>

      {/* ─── Hero 4-Model Comparison Deck (Tilt Cards) ─────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {/* Card 1: Physical NWP (NCUM / ECMWF IFS) */}
        <TiltCard
          borderColor="rgba(245, 158, 11, 0.4)"
          glowColor="rgba(245, 158, 11, 0.25)"
          style={{ padding: 18 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 4, padding: '2px 6px',
              }}>
                1. PHYSICAL NWP
              </span>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginTop: 4 }}>
                NCUM / IFS 9km
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
              Hydrostatic
            </span>
          </div>

          <div style={{ margin: '14px 0 10px 0' }}>
            <div style={{
              fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              color: '#fbbf24', lineHeight: 1,
            }}>
              {nwpVal.toFixed(1)} <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{unit}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10 }}>
              <span style={{ color: '#94a3b8' }}>Divergence from blend:</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                color: nwpDelta > 0 ? '#f87171' : nwpDelta < 0 ? '#60a5fa' : '#94a3b8',
              }}>
                {nwpDelta > 0 ? `+${nwpDelta}` : nwpDelta} {unit}
              </span>
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <ExtrudedWeightBar
              label="Assigned Weight"
              pct={forecast?.model_weights.nwp || 0.28}
              color="#f59e0b"
              detail={`Score: ${(nwpContrib?.reliability_score || 0.78).toFixed(2)}`}
            />
          </div>
        </TiltCard>

        {/* Card 2: 51-Member Ensemble (EPS / GEFS) */}
        <TiltCard
          borderColor="rgba(16, 185, 129, 0.4)"
          glowColor="rgba(16, 185, 129, 0.25)"
          style={{ padding: 18 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#10b981', background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 4, padding: '2px 6px',
              }}>
                2. ENSEMBLE NWP
              </span>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginTop: 4 }}>
                EPS 51-Member
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
              Probabilistic
            </span>
          </div>

          <div style={{ margin: '14px 0 10px 0' }}>
            <div style={{
              fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              color: '#34d399', lineHeight: 1,
            }}>
              {ensVal.toFixed(1)} <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{unit}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10 }}>
              <span style={{ color: '#94a3b8' }}>Divergence from blend:</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                color: ensDelta > 0 ? '#f87171' : ensDelta < 0 ? '#60a5fa' : '#94a3b8',
              }}>
                {ensDelta > 0 ? `+${ensDelta}` : ensDelta} {unit}
              </span>
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <ExtrudedWeightBar
              label="Assigned Weight"
              pct={forecast?.model_weights.ensemble || 0.34}
              color="#10b981"
              detail={`Score: ${(ensContrib?.reliability_score || 0.82).toFixed(2)}`}
            />
          </div>
        </TiltCard>

        {/* Card 3: Neural Weather AI (GraphNet / Pangu) */}
        <TiltCard
          borderColor="rgba(168, 85, 247, 0.4)"
          glowColor="rgba(168, 85, 247, 0.25)"
          style={{ padding: 18 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#c084fc', background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 4, padding: '2px 6px',
              }}>
                3. NEURAL AI / ML
              </span>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginTop: 4 }}>
                GraphNet 0.25°
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
              Deep Learning
            </span>
          </div>

          <div style={{ margin: '14px 0 10px 0' }}>
            <div style={{
              fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              color: '#c084fc', lineHeight: 1,
            }}>
              {aiVal.toFixed(1)} <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{unit}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10 }}>
              <span style={{ color: '#94a3b8' }}>Divergence from blend:</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                color: aiDelta > 0 ? '#f87171' : aiDelta < 0 ? '#60a5fa' : '#94a3b8',
              }}>
                {aiDelta > 0 ? `+${aiDelta}` : aiDelta} {unit}
              </span>
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <ExtrudedWeightBar
              label="Assigned Weight"
              pct={forecast?.model_weights.aiml || 0.38}
              color="#a855f7"
              detail={`Score: ${(aiContrib?.reliability_score || 0.89).toFixed(2)}`}
            />
          </div>
        </TiltCard>

        {/* Card 4: Hero Dynamically Blended Consensus */}
        <TiltCard
          borderColor="rgba(56, 189, 248, 0.7)"
          glowColor="rgba(56, 189, 248, 0.4)"
          style={{
            padding: 18,
            background: 'linear-gradient(135deg, rgba(8, 24, 48, 0.85) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '2px solid rgba(56, 189, 248, 0.6)',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#070b14', background: '#38bdf8',
                borderRadius: 4, padding: '2px 7px',
              }}>
                ⭐ 4. BLENDED RESULT
              </span>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
                Optimal Consensus
              </div>
            </div>
            <span style={{
              fontSize: 9, color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace",
              padding: '2px 6px', borderRadius: 4, background: 'rgba(56,189,248,0.15)',
            }}>
              LIVE OPTIMIZED
            </span>
          </div>

          <div style={{ margin: '14px 0 10px 0' }}>
            <div style={{
              fontSize: 32, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
              color: '#38bdf8', lineHeight: 1, textShadow: '0 0 12px rgba(56,189,248,0.5)',
            }}>
              {blendVal.toFixed(1)} <span style={{ fontSize: 14, color: '#bae6fd', fontWeight: 600 }}>{unit}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10 }}>
              <span style={{ color: '#bae6fd' }}>Consensus Agreement:</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#ffffff',
              }}>
                {forecast?.model_agreement_pct || 84}% Inter-Model Concordance
              </span>
            </div>
          </div>

          <div style={{
            paddingTop: 10, borderTop: '1px solid rgba(56,189,248,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#7dd3fc',
          }}>
            <span>Formula:</span>
            <span>w₁F_nwp + w₂F_ens + w₃F_ai</span>
          </div>
        </TiltCard>
      </div>

      {/* ─── Diagnostic HUD: Circular Gauges & Regimes ─────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
      }}>
        {/* Gauge Cluster Panel */}
        <div style={{
          background: 'rgba(10, 16, 31, 0.72)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(56, 189, 248, 0.18)',
          borderRadius: 18,
          padding: '18px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gauge className="w-4 h-4 text-cyan-400" />
              Consensus Diagnostic Telemetry
            </span>
            <span style={{
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              padding: '2px 6px', borderRadius: 4, background: 'rgba(56,189,248,0.1)',
              color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)',
            }}>
              LIVE METRICS
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <CircularGauge
              value={forecast?.confidence_pct || 86}
              label="Confidence"
              sublabel={forecast?.confidence_level || 'HIGH'}
              color="#10b981"
              size={96}
            />
            <CircularGauge
              value={forecast?.model_agreement_pct || 82}
              label="Agreement"
              sublabel="CONCORDANCE"
              color="#38bdf8"
              size={96}
            />
            <CircularGauge
              value={88}
              label="Skill Lift"
              sublabel="+18.4% vs NWP"
              color="#a855f7"
              size={96}
            />
          </div>

          <div style={{
            marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              {forecast?.confidence_rationale ||
                'High multi-model agreement across 51 ensemble members and neural weather network provides superior certainty.'}
            </span>
          </div>
        </div>

        {/* Extreme Risk & Atmospheric Regime HUD */}
        <div style={{
          background: 'rgba(10, 16, 31, 0.72)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(56, 189, 248, 0.18)',
          borderRadius: 18,
          padding: '18px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Synoptic Regime & Extreme Weather Risk
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                padding: '2px 8px', borderRadius: 4,
                background: forecast?.extreme_risk_level === 'High' || forecast?.extreme_risk_level === 'Critical'
                  ? 'rgba(239,68,68,0.2)'
                  : 'rgba(245,158,11,0.2)',
                color: forecast?.extreme_risk_level === 'High' || forecast?.extreme_risk_level === 'Critical'
                  ? '#f87171'
                  : '#fbbf24',
                border: '1px solid rgba(245,158,11,0.4)',
              }}>
                {forecast?.extreme_risk_level || 'Moderate'} Risk
              </span>
            </div>

            <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: '8px 0' }}>
              {forecast?.extreme_risk_summary ||
                `Elevated convective shear detected in ${currentRegion.name}. Precipitation rates may exceed 65 mm/h in localized orographic sectors.`}
            </p>

            <div style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>Dominant Model Driver:</span>
                <span style={{ color: '#c084fc', fontWeight: 700 }}>
                  {forecast?.dominant_model || 'Neural GraphNet AI'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>Regime Confidence:</span>
                <span style={{ color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                  {((forecast?.regime_confidence || 0.88) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 10, color: '#64748b', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Valid Period: T+{leadTime}h Horizon</span>
            <span>Generated: {new Date().toLocaleTimeString()} UTC</span>
          </div>
        </div>
      </div>

      {/* ─── Interactive Multi-Horizon Trajectory & 51-Member Dispersion Section ─── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.72)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.18)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {/* Navigation Tabs for Chart Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Multi-Model Horizon Trajectory & Ensemble Dispersion
            </h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Inspect model bifurcation across T+6h to T+120h and examine 51-member spread
            </span>
          </div>

          {/* View Mode Tabs */}
          <div style={{
            display: 'flex', gap: 4, background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(56,189,248,0.2)', borderRadius: 10, padding: 3,
          }}>
            <button
              onClick={() => setActiveTab('trajectory')}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === 'trajectory' ? 'rgba(56,189,248,0.25)' : 'transparent',
                color: activeTab === 'trajectory' ? '#38bdf8' : '#94a3b8',
                border: activeTab === 'trajectory' ? '1px solid rgba(56,189,248,0.4)' : 'none',
              }}
            >
              📈 Lead-Time Trajectory
            </button>
            <button
              onClick={() => setActiveTab('dispersion')}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === 'dispersion' ? 'rgba(56,189,248,0.25)' : 'transparent',
                color: activeTab === 'dispersion' ? '#38bdf8' : '#94a3b8',
                border: activeTab === 'dispersion' ? '1px solid rgba(56,189,248,0.4)' : 'none',
              }}
            >
              🎯 51-Member Spread
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === 'matrix' ? 'rgba(56,189,248,0.25)' : 'transparent',
                color: activeTab === 'matrix' ? '#38bdf8' : '#94a3b8',
                border: activeTab === 'matrix' ? '1px solid rgba(56,189,248,0.4)' : 'none',
              }}
            >
              📊 Model Matrix
            </button>
          </div>
        </div>

        {/* TAB 1: Composed Trajectory Chart with Shaded 80% & 95% Confidence Envelopes */}
        {activeTab === 'trajectory' && (
          <div>
            <div style={{ height: 340, width: '100%', marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trajectoryData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                  <defs>
                    {/* Glowing Cyan Fill for Confidence Envelope */}
                    <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="blendedLineGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="lead_time"
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="#475569"
                    unit={` ${unit}`}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 16, 31, 0.95)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: '#f8fafc',
                    }}
                    labelStyle={{ color: '#38bdf8', fontWeight: 800, marginBottom: 6 }}
                    formatter={(val: any, name: any) => [`${Number(val).toFixed(1)} ${unit}`, name]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 16, fontSize: 11 }}
                    iconType="circle"
                  />

                  {/* 80% Confidence Area Band */}
                  <Area
                    type="monotone"
                    dataKey="Confidence80Upper"
                    stroke="transparent"
                    fill="url(#confidenceBand)"
                    name="80% Probabilistic Envelope"
                  />
                  <Area
                    type="monotone"
                    dataKey="Confidence80Lower"
                    stroke="transparent"
                    fill="url(#confidenceBand)"
                    legendType="none"
                  />

                  {/* Model 1: Physical NWP Line (Amber) */}
                  <Line
                    type="monotone"
                    dataKey="NWP"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 0 }}
                    name="NWP Physical (NCUM/IFS)"
                  />

                  {/* Model 2: Ensemble 51M (Emerald) */}
                  <Line
                    type="monotone"
                    dataKey="Ensemble"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#10b981', strokeWidth: 0 }}
                    name="Ensemble (EPS 51M)"
                  />

                  {/* Model 3: Neural AI/ML (Purple) */}
                  <Line
                    type="monotone"
                    dataKey="AI_ML"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#c084fc', strokeWidth: 0 }}
                    name="AI/ML (GraphNet)"
                  />

                  {/* Hero Blended Line (Glowing Thick Electric Blue) */}
                  <Line
                    type="monotone"
                    dataKey="Blended"
                    stroke="url(#blendedLineGlow)"
                    strokeWidth={4}
                    dot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                    name="Adaptive Blended Consensus"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 10, color: '#64748b', marginTop: 10, paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span>* Shaded cyan envelope signifies 80% empirical ensemble confidence bounds.</span>
              <span>Horizontal Axis: Forecast Lead-Time (hours)</span>
            </div>
          </div>
        )}

        {/* TAB 2: 51-Member Ensemble Dispersion Strip & Member Distribution */}
        {activeTab === 'dispersion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(56,189,248,0.2)',
              borderRadius: 14,
              padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                  51-Member EPS Dispersion Strip at T+{leadTime}h
                </span>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#38bdf8' }}>
                  P10: {(blendVal * 0.85).toFixed(1)} {unit} | Median: {blendVal.toFixed(1)} {unit} | P90: {(blendVal * 1.18).toFixed(1)} {unit}
                </span>
              </div>

              {/* Graphical Dispersion Track */}
              <div style={{ position: 'relative', height: 48, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0 20px', display: 'flex', alignItems: 'center' }}>
                {/* Track Line */}
                <div style={{ position: 'absolute', left: 20, right: 20, height: 2, background: 'rgba(255,255,255,0.1)' }} />

                {/* Markers for Models */}
                {/* NWP Marker */}
                <div style={{
                  position: 'absolute',
                  left: '26%',
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: '#f59e0b',
                  boxShadow: '0 0 8px #f59e0b',
                }}>
                  <span style={{
                    position: 'absolute', top: -16, left: -14, fontSize: 8,
                    fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace',
                  }}>
                    NWP
                  </span>
                </div>

                {/* Ensemble Median Marker */}
                <div style={{
                  position: 'absolute',
                  left: '52%',
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}>
                  <span style={{
                    position: 'absolute', top: -16, left: -12, fontSize: 8,
                    fontWeight: 700, color: '#10b981', fontFamily: 'monospace',
                  }}>
                    ENS
                  </span>
                </div>

                {/* AI/ML Marker */}
                <div style={{
                  position: 'absolute',
                  left: '68%',
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: '#c084fc',
                  boxShadow: '0 0 8px #c084fc',
                }}>
                  <span style={{
                    position: 'absolute', top: -16, left: -8, fontSize: 8,
                    fontWeight: 700, color: '#c084fc', fontFamily: 'monospace',
                  }}>
                    AI
                  </span>
                </div>

                {/* Blended Optimal Target Marker */}
                <div style={{
                  position: 'absolute',
                  left: '56%',
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: '#38bdf8',
                  boxShadow: '0 0 12px #38bdf8',
                }}>
                  <span style={{
                    position: 'absolute', bottom: -16, left: -18, fontSize: 8,
                    fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace',
                  }}>
                    BLEND
                  </span>
                </div>

                {/* 51 Individual Member Dots */}
                {ensembleMembers.map((m) => {
                  const min = ensembleMembers[0]?.value || 0;
                  const max = ensembleMembers[ensembleMembers.length - 1]?.value || 100;
                  const posPct = max > min ? ((m.value - min) / (max - min)) * 90 + 5 : 50;

                  return (
                    <div
                      key={m.id}
                      title={`Member #${m.id}: ${m.value} ${unit}`}
                      style={{
                        position: 'absolute',
                        left: `${posPct}%`,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: m.isOutlier ? '#f87171' : 'rgba(56,189,248,0.7)',
                        boxShadow: m.isOutlier ? '0 0 6px #f87171' : '0 0 4px rgba(56,189,248,0.5)',
                        transform: 'translate(-50%, -50%)',
                        top: '50%',
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 22 }}>
                <span style={{ color: '#f59e0b' }}>● NWP: {nwpVal.toFixed(1)} {unit}</span>
                <span style={{ color: '#10b981' }}>● EPS 51M: {ensVal.toFixed(1)} {unit}</span>
                <span style={{ color: '#c084fc' }}>● GraphNet: {aiVal.toFixed(1)} {unit}</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>★ Blended: {blendVal.toFixed(1)} {unit}</span>
              </div>
            </div>

            {/* Dispersion Analysis Narrative */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12,
            }}>
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                  Ensemble Spread Analysis
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  The 51-member ECMWF EPS clusters tightly around the median, with only 4 outliers in the upper tail. This indicates high atmospheric predictability with minimal convective bifurcation risk.
                </p>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', marginBottom: 4 }}>
                  Neural GraphNet Advantage
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  AI resolves sharper mesoscale precipitation boundaries over orographic terrain in {currentRegion.name}, preventing the excessive spatial smearing typical of coarse hydrostatic NWP grids.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Model Attribute & Statistical Comparison Matrix */}
        {activeTab === 'matrix' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11 }}>
                  <th style={{ padding: '10px 12px' }}>Model System</th>
                  <th style={{ padding: '10px 12px' }}>Architecture</th>
                  <th style={{ padding: '10px 12px' }}>Predicted {varTitle}</th>
                  <th style={{ padding: '10px 12px' }}>Reliability Score</th>
                  <th style={{ padding: '10px 12px' }}>Historical MAE</th>
                  <th style={{ padding: '10px 12px' }}>Weight Allocated</th>
                  <th style={{ padding: '10px 12px' }}>Fusion Rationale</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {forecast?.model_contributions.map((c: ModelContribution) => {
                  const isAi = c.model_type === 'AI_ML';
                  const isEns = c.model_type === 'Ensemble';
                  const modelColor = isAi ? '#c084fc' : isEns ? '#34d399' : '#fbbf24';

                  return (
                    <tr
                      key={c.model_id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '12px', fontFamily: 'sans-serif', fontWeight: 600, color: '#f8fafc' }}>
                        <span style={{ color: modelColor, marginRight: 6 }}>●</span>
                        {c.model_name}
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{c.model_type}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#ffffff' }}>
                        {variable === 'rainfall'
                          ? `${c.rainfall_mm} mm`
                          : variable === 'temperature'
                          ? `${c.temperature_c} °C`
                          : `${c.wind_speed_kmh} km/h`}
                      </td>
                      <td style={{ padding: '12px', color: '#38bdf8' }}>{c.reliability_score.toFixed(3)}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{c.historical_mae}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: modelColor }}>
                        {(c.weight * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'sans-serif', fontSize: 11, color: '#cbd5e1' }}>
                        {c.model_type === 'AI_ML'
                          ? 'Captures localized convective gradients & non-linear precipitation peaks'
                          : c.model_type === 'NWP'
                          ? 'Enforces barotropic mass conservation & hydrostatic balance'
                          : 'Quantifies chaotic atmospheric divergence across 51 perturbed states'}
                      </td>
                    </tr>
                  );
                })}

                {/* Consensus Row */}
                <tr style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderTop: '2px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 700,
                }}>
                  <td style={{ padding: '12px', fontFamily: 'sans-serif', color: '#38bdf8' }}>
                    ⭐ Adaptive Blended Forecast
                  </td>
                  <td style={{ padding: '12px', color: '#38bdf8' }}>Dynamic Hybrid</td>
                  <td style={{ padding: '12px', color: '#38bdf8', fontSize: 14 }}>
                    {blendVal.toFixed(1)} {unit}
                  </td>
                  <td style={{ padding: '12px', color: '#38bdf8' }}>0.940</td>
                  <td style={{ padding: '12px', color: '#34d399' }}>-18.4% Lift</td>
                  <td style={{ padding: '12px', color: '#ffffff' }}>100.0%</td>
                  <td style={{ padding: '12px', fontFamily: 'sans-serif', fontSize: 11, color: '#38bdf8' }}>
                    Dynamically weighted optimal meteorological consensus
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Explainable AI (XAI) Blending Rationale Deck ─────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.72)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.18)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Explainable AI (XAI) Adaptive Weighting Drivers
          </h3>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#a855f7' }}>
            REGIME: {regime.toUpperCase()}
          </span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14,
        }}>
          {/* Driver 1 */}
          <div style={{
            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: 14, display: 'flex', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: 'rgba(56,189,248,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', flexShrink: 0,
            }}>
              1
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                Spatial & Topographic Adaptation
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                In {currentRegion.name}, complex relief induces localized orographic lift. GraphNet weights are boosted by +12% because deep neural convolutions resolve micro-topographic moisture advection.
              </p>
            </div>
          </div>

          {/* Driver 2 */}
          <div style={{
            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: 14, display: 'flex', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0,
            }}>
              2
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                Lead-Time Decay Scaling
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                At T+{leadTime}h, AI retains high spatial skill. Beyond T+72h, weighting dynamically pivots toward the 51-Member Ensemble to account for non-linear chaos growth in tropospheric flow.
              </p>
            </div>
          </div>

          {/* Driver 3 */}
          <div style={{
            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: 14, display: 'flex', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0,
            }}>
              3
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                Physical Mass Conservation Anchor
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                NCUM physical NWP supplies a rigid boundary constraint, preventing the AI from hallucinatory thermodynamic drifting during sudden synoptic monsoonal depressions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastExplorer;
