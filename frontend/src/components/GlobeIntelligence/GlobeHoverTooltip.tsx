/**
 * GlobeHoverTooltip.tsx
 * Floating tooltip shown when the user hovers over a country.
 */
import React from 'react';

export interface HoverData {
  country: string;
  region?: string;
  temperature?: number;
  rainfall?: number;
  wind?: number;
  regime?: string;
  confidence?: number;
  loading?: boolean;
}

interface Props {
  data: HoverData | null;
  x: number;
  y: number;
}

export const GlobeHoverTooltip: React.FC<Props> = ({ data, x, y }) => {
  if (!data) return null;

  const regimeColor: Record<string, string> = {
    'Heavy Rain':   '#38bdf8',
    'Extreme Rain': '#f87171',
    'Heat Wave':    '#fb923c',
    'High Wind':    '#a78bfa',
    'Convective':   '#fbbf24',
    'Storm':        '#f87171',
    'Normal':       '#34d399',
    'Dry':          '#94a3b8',
  };
  const rc = regimeColor[data.regime ?? ''] ?? '#38bdf8';

  return (
    <div
      style={{
        position: 'fixed',
        left: x + 16,
        top:  y - 10,
        zIndex: 9999,
        pointerEvents: 'none',
        animation: 'tooltipAppear 0.18s ease',
      }}
    >
      <style>{`
        @keyframes tooltipAppear {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={{
        background: 'rgba(7,11,20,0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56,189,248,0.30)',
        borderRadius: 14,
        padding: '14px 18px',
        minWidth: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.08)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 900, color: '#f8fafc',
              letterSpacing: '0.02em', lineHeight: 1.2,
            }}>{data.country}</div>
            {data.region && (
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{data.region}</div>
            )}
          </div>
          {data.regime && (
            <span style={{
              fontSize: 8, fontWeight: 800, letterSpacing: '0.09em',
              padding: '3px 7px', borderRadius: 5,
              background: `rgba(${hexToRgbStr(rc)},0.15)`,
              border: `1px solid rgba(${hexToRgbStr(rc)},0.35)`,
              color: rc, whiteSpace: 'nowrap', marginLeft: 8,
            }}>{data.regime.toUpperCase()}</span>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(56,189,248,0.12)', marginBottom: 10 }} />

        {/* Weather values */}
        {data.loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: 10, borderRadius: 4,
                background: 'linear-gradient(90deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
                width: `${60 + i * 15}%`,
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {data.temperature !== undefined && (
              <TooltipRow icon="🌡" label="Temperature" value={`${data.temperature.toFixed(1)}°C`} color="#fb923c" />
            )}
            {data.rainfall !== undefined && (
              <TooltipRow icon="🌧" label="Rainfall" value={`${data.rainfall.toFixed(1)} mm`} color="#38bdf8" />
            )}
            {data.wind !== undefined && (
              <TooltipRow icon="💨" label="Wind" value={`${data.wind.toFixed(0)} km/h`} color="#a78bfa" />
            )}
            {data.confidence !== undefined && (
              <TooltipRow icon="🎯" label="Confidence" value={`${data.confidence}%`} color="#34d399" />
            )}
          </div>
        )}

        {/* Click hint */}
        <div style={{
          marginTop: 10, fontSize: 9, color: '#475569',
          borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8,
          fontFamily: 'monospace', letterSpacing: '0.06em',
        }}>
          Click to run forecast intelligence
        </div>
      </div>
    </div>
  );
};

const TooltipRow: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 11 }}>{icon}</span> {label}
    </span>
    <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</span>
  </div>
);

function hexToRgbStr(hex: string): string {
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '56,189,248';
}
