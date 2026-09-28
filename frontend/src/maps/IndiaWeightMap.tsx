import React, { useState } from 'react';
import { RegionalWeightDetail } from '../types';
import { MapPin, Compass, ShieldAlert, Sparkles } from 'lucide-react';

interface IndiaWeightMapProps {
  regions: RegionalWeightDetail[];
  selectedModel: 'nwp' | 'ensemble' | 'aiml';
  onSelectRegion: (region: RegionalWeightDetail) => void;
  activeRegionId: string;
}

export const IndiaWeightMap: React.FC<IndiaWeightMapProps> = ({
  regions,
  selectedModel,
  onSelectRegion,
  activeRegionId,
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<RegionalWeightDetail | null>(null);

  // Approximate relative (x, y) coordinates for Indian states on normalized 600x650 viewport
  const stateLayoutCoordinates: Record<string, { x: number; y: number; width: number; height: number }> = {
    delhi: { x: 250, y: 150, width: 85, height: 60 },
    rajasthan: { x: 130, y: 190, width: 130, height: 95 },
    maharashtra: { x: 180, y: 340, width: 140, height: 95 },
    gujarat: { x: 100, y: 290, width: 110, height: 75 },
    karnataka: { x: 190, y: 440, width: 110, height: 90 },
    kerala: { x: 190, y: 535, width: 75, height: 75 },
    tamil_nadu: { x: 260, y: 495, width: 105, height: 95 },
    odisha: { x: 370, y: 320, width: 115, height: 80 },
    west_bengal: { x: 410, y: 270, width: 85, height: 75 },
    assam: { x: 480, y: 190, width: 105, height: 75 },
  };

  const getWeightColor = (weight: number, model: string) => {
    if (model === 'aiml') {
      if (weight >= 0.45) return 'rgba(56, 189, 248, 0.9)'; // Vivid Cyan
      if (weight >= 0.35) return 'rgba(56, 189, 248, 0.65)';
      if (weight >= 0.25) return 'rgba(56, 189, 248, 0.4)';
      return 'rgba(56, 189, 248, 0.2)';
    } else if (model === 'nwp') {
      if (weight >= 0.45) return 'rgba(245, 158, 11, 0.9)'; // Amber
      if (weight >= 0.35) return 'rgba(245, 158, 11, 0.65)';
      if (weight >= 0.25) return 'rgba(245, 158, 11, 0.4)';
      return 'rgba(245, 158, 11, 0.2)';
    } else {
      // Ensemble
      if (weight >= 0.45) return 'rgba(16, 185, 129, 0.9)'; // Emerald
      if (weight >= 0.35) return 'rgba(16, 185, 129, 0.65)';
      if (weight >= 0.25) return 'rgba(16, 185, 129, 0.4)';
      return 'rgba(16, 185, 129, 0.2)';
    }
  };

  const modelLabels = {
    nwp: 'Physical NWP (NCUM/IFS 9km)',
    ensemble: 'Ensemble NWP (EPS 51-Member)',
    aiml: 'Neural Weather AI (GraphNet 0.25°)',
  };

  const modelThemeColor = selectedModel === 'aiml' ? '#38bdf8' : selectedModel === 'nwp' ? '#f59e0b' : '#10b981';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      background: 'rgba(10, 16, 31, 0.75)',
      backdropFilter: 'blur(20px)',
      borderRadius: 20,
      border: '1px solid rgba(56, 189, 248, 0.2)',
      padding: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      overflow: 'hidden',
    }}>
      {/* Header Controls & Weight Scale Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
        alignItems: 'center', gap: 12, paddingBottom: 14,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Compass className="w-5 h-5 text-cyan-400" />
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Spatiotemporal Model Allocation Map
            </h3>
            <span style={{
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              padding: '2px 6px', borderRadius: 4, background: 'rgba(251,191,36,0.12)',
              color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)',
            }}>
              DEMO DATA
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0' }}>
            Allocated weighting intensity for{' '}
            <span style={{ color: modelThemeColor, fontWeight: 700 }}>
              {modelLabels[selectedModel]}
            </span>
          </p>
        </div>

        {/* Continuous Color Scale Legend */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '6px 12px', borderRadius: 10,
          border: '1px solid rgba(56,189,248,0.2)',
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
        }}>
          <span style={{ color: '#94a3b8' }}>0.0 (Low)</span>
          <div style={{
            width: 90, height: 8, borderRadius: 4,
            background: selectedModel === 'aiml'
              ? 'linear-gradient(90deg, rgba(56,189,248,0.1) 0%, #38bdf8 100%)'
              : selectedModel === 'nwp'
              ? 'linear-gradient(90deg, rgba(245,158,11,0.1) 0%, #f59e0b 100%)'
              : 'linear-gradient(90deg, rgba(16,185,129,0.1) 0%, #10b981 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }} />
          <span style={{ color: modelThemeColor, fontWeight: 700 }}>1.0 (Dominant)</span>
        </div>
      </div>

      {/* SVG Interactive Regional Representation */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
        <svg
          viewBox="0 0 600 640"
          style={{ width: '100%', maxWidth: 580, height: 'auto', userSelect: 'none' }}
        >
          <defs>
            <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="beaconGlow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Latitude & Longitude Grid Lines */}
          <line x1="60" y1="180" x2="540" y2="180" stroke="rgba(56,189,248,0.06)" strokeDasharray="3 3" />
          <line x1="60" y1="320" x2="540" y2="320" stroke="rgba(56,189,248,0.06)" strokeDasharray="3 3" />
          <line x1="60" y1="460" x2="540" y2="460" stroke="rgba(56,189,248,0.06)" strokeDasharray="3 3" />
          <text x="65" y="175" fill="#475569" fontSize="8" fontFamily="monospace">28°N (Delhi Plains)</text>
          <text x="65" y="315" fill="#475569" fontSize="8" fontFamily="monospace">20°N (Deccan Plateau)</text>
          <text x="65" y="455" fill="#475569" fontSize="8" fontFamily="monospace">14°N (Western Ghats)</text>

          {/* Geographic Subcontinental Outline */}
          <path
            d="M 230 60 L 300 90 L 340 130 L 440 160 L 530 170 L 580 230 L 490 280 L 440 330 L 370 420 L 300 580 L 250 620 L 210 590 L 180 500 L 150 400 L 90 320 L 80 240 L 150 150 Z"
            fill="rgba(15, 23, 42, 0.45)"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Regional Blocks */}
          {regions.map((reg) => {
            const coords = stateLayoutCoordinates[reg.region_id.toLowerCase()] || {
              x: 250,
              y: 300,
              width: 90,
              height: 70,
            };
            const weightVal =
              selectedModel === 'aiml'
                ? reg.aiml_weight
                : selectedModel === 'nwp'
                ? reg.nwp_weight
                : reg.ensemble_weight;

            const isSelected = activeRegionId === reg.region_id;
            const isHovered = hoveredRegion?.region_id === reg.region_id;

            return (
              <g
                key={reg.region_id}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => onSelectRegion(reg)}
                onMouseEnter={() => setHoveredRegion(reg)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                {/* Active State Radar Beacon Ring */}
                {isSelected && (
                  <rect
                    x={coords.x - 4}
                    y={coords.y - 4}
                    width={coords.width + 8}
                    height={coords.height + 8}
                    rx="14"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.9"
                  >
                    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
                  </rect>
                )}

                {/* State Surface Block */}
                <rect
                  x={coords.x}
                  y={coords.y}
                  width={coords.width}
                  height={coords.height}
                  rx="10"
                  fill={getWeightColor(weightVal, selectedModel)}
                  stroke={isSelected ? '#38bdf8' : isHovered ? '#67e8f9' : 'rgba(56, 189, 248, 0.25)'}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                  filter={isSelected || isHovered ? 'url(#mapGlow)' : undefined}
                />

                {/* State Label */}
                <text
                  x={coords.x + coords.width / 2}
                  y={coords.y + coords.height / 2 - 6}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="700"
                  style={{ pointerEvents: 'none' }}
                >
                  {reg.region_name}
                </text>

                {/* Weight Percentage Tag */}
                <text
                  x={coords.x + coords.width / 2}
                  y={coords.y + coords.height / 2 + 13}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : '#e0f2fe'}
                  fontSize="11"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="800"
                  style={{ pointerEvents: 'none' }}
                >
                  {(weightVal * 100).toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Details Card */}
        {hoveredRegion && (
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 30,
            width: 250,
            padding: 14,
            borderRadius: 14,
            background: 'rgba(10, 16, 31, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            fontSize: 11,
            pointerEvents: 'none',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6, marginBottom: 8,
            }}>
              <span style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin className="w-3.5 h-3.5" />
                {hoveredRegion.region_name}
              </span>
              <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' }}>T+24h</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f59e0b' }}>● NWP Weight:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{(hoveredRegion.nwp_weight * 100).toFixed(1)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#10b981' }}>● Ensemble Weight:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{(hoveredRegion.ensemble_weight * 100).toFixed(1)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#38bdf8' }}>● AI/ML Weight:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{(hoveredRegion.aiml_weight * 100).toFixed(1)}%</span>
              </div>
              <div style={{
                marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', color: '#94a3b8',
              }}>
                <span>Historical Best:</span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>{hoveredRegion.historical_best_model}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        textAlign: 'center', fontSize: 11, color: '#64748b', paddingTop: 10,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        Click any Indian state region above to inspect its real-time weight composition and blended forecast.
      </div>
    </div>
  );
};

export default IndiaWeightMap;
