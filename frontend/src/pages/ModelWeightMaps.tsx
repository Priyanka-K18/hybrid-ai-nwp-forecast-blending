import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Map,
  Compass,
  Layers,
  MapPin,
  TrendingUp,
  Info,
  CheckCircle2,
  Calendar,
  Zap,
  Sliders,
  Copy,
  Check,
  Award,
  Sparkles,
} from 'lucide-react';
import { IndiaWeightMap } from '../maps/IndiaWeightMap';
import { fetchWeightMap } from '../services/api';
import { WeightMapResponse, RegionalWeightDetail, Region } from '../types';

// ─── 3D Extruded Weight Bar ───────────────────────────────────────────────────
const ExtrudedBar: React.FC<{
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
        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
  </div>
);

export const ModelWeightMaps: React.FC = () => {
  const { selectedRegionId, setSelectedRegionId, regions } = useOutletContext<{
    selectedRegionId: string;
    setSelectedRegionId: (id: string) => void;
    regions: Region[];
  }>();

  const [selectedModel, setSelectedModel] = useState<'nwp' | 'ensemble' | 'aiml'>('aiml');
  const [variable, setVariable] = useState<string>('rainfall');
  const [leadTime, setLeadTime] = useState<number>(24);
  const [season, setSeason] = useState<string>('Monsoon');
  const [regime, setRegime] = useState<string>('Convective');
  const [mapData, setMapData] = useState<WeightMapResponse | null>(null);
  const [activeRegionalDetail, setActiveRegionalDetail] = useState<RegionalWeightDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    fetchWeightMap(variable, leadTime, season, regime)
      .then((data) => {
        setMapData(data);
        const match = data.regions.find((r) => r.region_id === selectedRegionId) || data.regions[0];
        setActiveRegionalDetail(match);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedRegionId, variable, leadTime, season, regime]);

  const handleRegionClick = (reg: RegionalWeightDetail) => {
    setActiveRegionalDetail(reg);
    setSelectedRegionId(reg.region_id);
  };

  const handleCopyWeights = () => {
    if (!mapData) return;
    navigator.clipboard.writeText(JSON.stringify(mapData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leadTimes = [6, 12, 24, 48, 72, 120];

  // Ranked regions by selected model weight
  const sortedRegions = useMemo(() => {
    if (!mapData) return [];
    return [...mapData.regions].sort((a, b) => {
      const wA = selectedModel === 'aiml' ? a.aiml_weight : selectedModel === 'nwp' ? a.nwp_weight : a.ensemble_weight;
      const wB = selectedModel === 'aiml' ? b.aiml_weight : selectedModel === 'nwp' ? b.nwp_weight : b.ensemble_weight;
      return wB - wA;
    });
  }, [mapData, selectedModel]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: '#f8fafc', paddingBottom: 40 }}>
      {/* ─── Command Deck Top Banner ─────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(168,85,247,0.2) 100%)',
              border: '1px solid rgba(56,189,248,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Map className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 style={{
                fontSize: 20, fontWeight: 800, margin: 0,
                background: 'linear-gradient(90deg, #ffffff 0%, #38bdf8 60%, #a855f7 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                SPATIOTEMPORAL MODEL WEIGHT MAPS
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
                  Adaptive Bayesian Weight Allocation • Terrain, Season & Lead-Horizon Dynamics
                </span>
              </div>
            </div>
          </div>

          {/* Model Switcher Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', background: 'rgba(15, 23, 42, 0.9)',
              padding: 3, borderRadius: 12, border: '1px solid rgba(56, 189, 248, 0.25)',
              gap: 4,
            }}>
              <button
                onClick={() => setSelectedModel('aiml')}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: selectedModel === 'aiml' ? '#38bdf8' : 'transparent',
                  color: selectedModel === 'aiml' ? '#070b14' : '#94a3b8',
                  border: 'none',
                  boxShadow: selectedModel === 'aiml' ? '0 0 12px rgba(56,189,248,0.5)' : 'none',
                }}
              >
                AI / ML GraphNet
              </button>
              <button
                onClick={() => setSelectedModel('ensemble')}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: selectedModel === 'ensemble' ? '#10b981' : 'transparent',
                  color: selectedModel === 'ensemble' ? '#070b14' : '#94a3b8',
                  border: 'none',
                  boxShadow: selectedModel === 'ensemble' ? '0 0 12px rgba(16,185,129,0.5)' : 'none',
                }}
              >
                Ensemble 51M
              </button>
              <button
                onClick={() => setSelectedModel('nwp')}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: selectedModel === 'nwp' ? '#f59e0b' : 'transparent',
                  color: selectedModel === 'nwp' ? '#070b14' : '#94a3b8',
                  border: 'none',
                  boxShadow: selectedModel === 'nwp' ? '0 0 12px rgba(245,158,11,0.5)' : 'none',
                }}
              >
                Physical NWP
              </button>
            </div>

            <button
              onClick={handleCopyWeights}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.1)',
                border: copied ? '1px solid #10b981' : '1px solid rgba(56,189,248,0.3)',
                color: copied ? '#34d399' : '#38bdf8',
                padding: '7px 12px', borderRadius: 10,
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'COPIED' : 'EXPORT'}
            </button>
          </div>
        </div>

        {/* ─── Filter Parameters ──────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Variable
            </label>
            <select
              value={variable}
              onChange={(e) => setVariable(e.target.value)}
              style={{
                width: '100%', background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8,
                padding: '7px 10px', fontSize: 12, color: '#38bdf8', fontWeight: 600, outline: 'none',
              }}
            >
              <option value="rainfall">🌧️ Rainfall</option>
              <option value="temperature">🌡️ Temperature</option>
              <option value="wind">💨 Wind Speed</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Forecast Horizon
            </label>
            <select
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              style={{
                width: '100%', background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8,
                padding: '7px 10px', fontSize: 12, color: '#38bdf8', fontWeight: 600, outline: 'none',
              }}
            >
              <option value={6}>6h (Nowcasting)</option>
              <option value={12}>12h (Half-Day)</option>
              <option value={24}>24h (Day 1 Synoptic)</option>
              <option value={48}>48h (Day 2 Synoptic)</option>
              <option value={72}>72h (Day 3 Medium)</option>
              <option value={120}>120h (Day 5 Medium)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Season
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              style={{
                width: '100%', background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8,
                padding: '7px 10px', fontSize: 12, color: '#38bdf8', fontWeight: 600, outline: 'none',
              }}
            >
              <option value="Monsoon">Monsoon (JJAS)</option>
              <option value="Summer">Summer / Pre-Monsoon</option>
              <option value="Winter">Winter (JF)</option>
              <option value="Post-Monsoon">Post-Monsoon (OND)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Weather Regime
            </label>
            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value)}
              style={{
                width: '100%', background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8,
                padding: '7px 10px', fontSize: 12, color: '#38bdf8', fontWeight: 600, outline: 'none',
              }}
            >
              <option value="Normal">Normal / Barotropic</option>
              <option value="Convective">Convective Instability</option>
              <option value="Heavy Rain">Heavy Rain Event</option>
              <option value="Heat Wave">Heat Wave</option>
              <option value="High Wind">Gale Wind</option>
              <option value="Cyclonic">Cyclonic System</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {mapData && (
              <div style={{
                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                borderRadius: 8, padding: '7px 12px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span style={{ color: '#94a3b8' }}>National Avg: </span>
                <span style={{ color: '#38bdf8', fontWeight: 800 }}>
                  {(
                    (selectedModel === 'aiml'
                      ? mapData.average_weights.aiml
                      : selectedModel === 'nwp'
                      ? mapData.average_weights.nwp
                      : mapData.average_weights.ensemble) * 100
                  ).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Map & Regional Inspector Side-by-Side ────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
      }}>
        {/* Left: Interactive India Weight Map */}
        <div>
          <IndiaWeightMap
            regions={mapData?.regions || []}
            selectedModel={selectedModel}
            onSelectRegion={handleRegionClick}
            activeRegionId={activeRegionalDetail?.region_id || selectedRegionId}
          />
        </div>

        {/* Right: Selected Region Detailed Inspector Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'rgba(10, 16, 31, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 20,
            padding: 22,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12,
            }}>
              <div>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Regional Weight Inspector
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  {activeRegionalDetail?.region_name || 'Select a Region'}
                </h2>
              </div>
              <span style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                padding: '3px 8px', borderRadius: 6,
                background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
                border: '1px solid rgba(56,189,248,0.3)', fontWeight: 700,
              }}>
                T+{leadTime}h Horizon
              </span>
            </div>

            {/* Weights Breakdown Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 12, padding: 12,
              }}>
                <ExtrudedBar
                  label="1. Physical NWP (NCUM/IFS)"
                  pct={activeRegionalDetail?.nwp_weight || 0.28}
                  color="#f59e0b"
                  sub="Hydrostatic Mass Balance"
                />
              </div>

              <div style={{
                background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 12, padding: 12,
              }}>
                <ExtrudedBar
                  label="2. Ensemble NWP (51M EPS)"
                  pct={activeRegionalDetail?.ensemble_weight || 0.34}
                  color="#10b981"
                  sub="Chaos Variance Dampening"
                />
              </div>

              <div style={{
                background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 12, padding: 12,
              }}>
                <ExtrudedBar
                  label="3. Neural Weather AI (GraphNet)"
                  pct={activeRegionalDetail?.aiml_weight || 0.38}
                  color="#38bdf8"
                  sub="Orographic Convective Lift"
                />
              </div>
            </div>

            {/* Regional Metadata Summary */}
            <div style={{
              background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Historical Best Performer:</span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                  {activeRegionalDetail?.historical_best_model || 'AI/ML'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Dominant in Active Run:</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                  {activeRegionalDetail?.dominant_model || 'AI/ML GraphNet'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Sample Blended Precipitation:</span>
                <span style={{ color: '#ffffff', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                  {activeRegionalDetail?.sample_rainfall_blend || 42.5} mm
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Bayesian Confidence Tier:</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>
                  {activeRegionalDetail?.confidence || 'High (94%)'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.4 }}>
              💡 Notice how high-relief peninsular states (Karnataka, Kerala) maximize AI/ML allocation to capture steep orographic convective gradients, while northern plain states rely on NWP mass conservation.
            </div>
          </div>

          {/* Regional Ranking Leaderboard */}
          <div style={{
            background: 'rgba(10, 16, 31, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 20,
            padding: 18,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award className="w-4 h-4 text-cyan-400" />
                Regional Allocation Ranking ({selectedModel.toUpperCase()})
              </span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>Top 5</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sortedRegions.slice(0, 5).map((r, idx) => {
                const w = selectedModel === 'aiml' ? r.aiml_weight : selectedModel === 'nwp' ? r.nwp_weight : r.ensemble_weight;
                const isSelected = activeRegionalDetail?.region_id === r.region_id;

                return (
                  <div
                    key={r.region_id}
                    onClick={() => handleRegionClick(r)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      background: isSelected ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.05)',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : 'rgba(255,255,255,0.1)',
                        color: idx <= 1 ? '#070b14' : '#fff',
                        fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: 600, color: isSelected ? '#38bdf8' : '#e2e8f0' }}>
                        {r.region_name}
                      </span>
                    </div>

                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#38bdf8' }}>
                      {(w * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelWeightMaps;
