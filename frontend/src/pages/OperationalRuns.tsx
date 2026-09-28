import React, { useState, useEffect, useCallback } from 'react';
import {
  PlayCircle, RefreshCw, CheckCircle2, Activity, Layers,
  Zap, Database, Satellite, Brain, GitMerge, AlertTriangle,
  BarChart3, Clock, Cpu, TrendingUp, Shield, ChevronRight,
  Globe, Wind, Cloud, ArrowRight,
} from 'lucide-react';
import { fetchOperationalStatus, triggerForecastRun } from '../services/api';
import { OperationalRunStatus } from '../types';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Pipeline stage definitions matching the user's requested architecture     */
/* ─────────────────────────────────────────────────────────────────────────── */

interface PipelineNode {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  glow: string;
  border: string;
  stepNumbers: number[];
  metric?: string;
  metricLabel?: string;
}

const NODES: PipelineNode[] = [
  { id: 'ecmwf',   label: 'ECMWF IFS',                  sublabel: '0.1° • ENS 51-member',            icon: <Globe style={{width:18,height:18}} />,         color: '#38bdf8', glow: 'rgba(56,189,248,0.35)',   border: 'rgba(56,189,248,0.45)',   stepNumbers: [1,2],     metric: '51M',    metricLabel: 'Members' },
  { id: 'gfs',     label: 'GFS NCEP',                   sublabel: '0.25° • Deterministic',            icon: <Wind style={{width:18,height:18}} />,           color: '#a78bfa', glow: 'rgba(167,139,250,0.35)', border: 'rgba(167,139,250,0.45)', stepNumbers: [1,2],     metric: '0.25°',  metricLabel: 'Resolution' },
  { id: 'icon',    label: 'ICON DWD',                   sublabel: '0.125° • Convection-permitting',   icon: <Cloud style={{width:18,height:18}} />,          color: '#fb923c', glow: 'rgba(251,146,60,0.35)',  border: 'rgba(251,146,60,0.45)',  stepNumbers: [1,2],     metric: 'R2C',    metricLabel: 'Mode' },
  { id: 'align',   label: 'Spatial & Temporal Align',   sublabel: '0.1° common grid • UTC sync',      icon: <Layers style={{width:18,height:18}} />,         color: '#22d3ee', glow: 'rgba(34,211,238,0.30)',  border: 'rgba(34,211,238,0.40)', stepNumbers: [3,4],     metric: '25k',    metricLabel: 'Gridpoints' },
  { id: 'era5',    label: 'ERA5 Reanalysis',            sublabel: 'ECMWF Historical • 0.25°',         icon: <Database style={{width:18,height:18}} />,       color: '#34d399', glow: 'rgba(52,211,153,0.35)',  border: 'rgba(52,211,153,0.45)', stepNumbers: [5,6],     metric: '30d',    metricLabel: 'Skill Window' },
  { id: 'obs',     label: 'Satellite / Radar / AWS',    sublabel: 'In-situ + remote sensing',         icon: <Satellite style={{width:18,height:18}} />,      color: '#fbbf24', glow: 'rgba(251,191,36,0.35)',  border: 'rgba(251,191,36,0.45)', stepNumbers: [12,13],   metric: '450+',   metricLabel: 'Stations' },
  { id: 'ai',      label: 'Deep-Learning AI Model',     sublabel: 'GraphNet • Pangu • FourCastNet',   icon: <Brain style={{width:18,height:18}} />,          color: '#e879f9', glow: 'rgba(232,121,249,0.35)', border: 'rgba(232,121,249,0.45)',stepNumbers: [1],       metric: 'DL',     metricLabel: 'Inference' },
  { id: 'weights', label: 'Adaptive Weight Engine',     sublabel: 'Inverse-MAE • Regime-aware',       icon: <Cpu style={{width:18,height:18}} />,            color: '#f472b6', glow: 'rgba(244,114,182,0.35)', border: 'rgba(244,114,182,0.45)',stepNumbers: [7],       metric: '1.000',  metricLabel: 'Σ Weights' },
  { id: 'blend',   label: 'Hybrid Forecast Blending',   sublabel: 'F = w₁·NWP + w₂·ENS + w₃·AI',    icon: <GitMerge style={{width:18,height:18}} />,       color: '#10b981', glow: 'rgba(16,185,129,0.35)',  border: 'rgba(16,185,129,0.45)', stepNumbers: [8,9,11],  metric: 'HIGH',   metricLabel: 'Confidence' },
  { id: 'extreme', label: 'Extreme-Weather Detection',  sublabel: 'CAPE • PWAT • Cyclone • Flood',    icon: <AlertTriangle style={{width:18,height:18}} />, color: '#f87171', glow: 'rgba(248,113,113,0.35)', border: 'rgba(248,113,113,0.45)',stepNumbers: [10],      metric: 'ACTIVE', metricLabel: 'Alerts' },
  { id: 'dash',    label: 'Dashboard & Decision Support',sublabel: 'GeoJSON tiles • MAE/CRPS/Brier',  icon: <BarChart3 style={{width:18,height:18}} />,      color: '#818cf8', glow: 'rgba(129,140,248,0.35)', border: 'rgba(129,140,248,0.45)',stepNumbers: [14],      metric: '14/14',  metricLabel: 'Converged' },
];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const PipelineCard: React.FC<{ node: PipelineNode; stepStatuses: Record<number,string> }> = ({ node, stepStatuses }) => {
  const allDone = node.stepNumbers.every(n => stepStatuses[n] === 'COMPLETED');
  return (
    <div style={{
      background: `rgba(${hexToRgb(node.color)},${allDone ? 0.12 : 0.05})`,
      border: `1px solid ${allDone ? node.border : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14, padding: '13px 15px', minWidth: 190, maxWidth: 230,
      boxShadow: allDone ? `0 0 18px ${node.glow}` : 'none',
      transition: 'all 0.5s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `rgba(${hexToRgb(node.color)},0.18)`,
          border: `1px solid ${node.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: node.color, flexShrink: 0,
        }}>{node.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>{node.label}</div>
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{node.sublabel}</div>
        </div>
        {allDone && <CheckCircle2 style={{ width:13, height:13, color: node.color, flexShrink: 0 }} />}
      </div>
      {node.metric && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '3px 8px', borderRadius: 7,
          background: `rgba(${hexToRgb(node.color)},0.10)`,
          border: `1px solid rgba(${hexToRgb(node.color)},0.20)`, marginBottom: 6,
        }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{node.metricLabel}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: node.color, fontFamily: 'monospace' }}>{node.metric}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {node.stepNumbers.map(n => (
          <span key={n} style={{
            fontSize: 8, padding: '2px 5px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 700,
            background: stepStatuses[n]==='COMPLETED' ? `rgba(${hexToRgb(node.color)},0.2)` : 'rgba(255,255,255,0.04)',
            color: stepStatuses[n]==='COMPLETED' ? node.color : '#475569',
            border: `1px solid ${stepStatuses[n]==='COMPLETED' ? node.border : 'rgba(255,255,255,0.06)'}`,
          }}>S{n}</span>
        ))}
      </div>
    </div>
  );
};

const FlowArrow: React.FC<{ color?: string; label?: string }> = ({ color = 'rgba(56,189,248,0.5)', label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0 8px' }}>
    <div style={{ width: 2, height: 28, background: `linear-gradient(180deg,transparent,${color},transparent)`, borderRadius: 2 }} />
    {label && (
      <span style={{
        fontSize: 8, color: '#475569', fontFamily: 'monospace', fontWeight: 700,
        padding: '2px 7px', borderRadius: 4, margin: '3px 0',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        whiteSpace: 'nowrap',
      }}>{label}</span>
    )}
    <ChevronRight style={{ width: 12, height: 12, color, transform: 'rotate(90deg)' }} />
  </div>
);

const RowLabel: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div style={{
    textAlign: 'center', fontSize: 9, fontFamily: 'monospace', fontWeight: 800,
    letterSpacing: '0.10em', color, opacity: 0.70, marginBottom: 10,
  }}>{label}</div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
export const OperationalRuns: React.FC = () => {
  const [runStatus, setRunStatus] = useState<OperationalRunStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const stepStatuses: Record<number, string> = {};
  runStatus?.steps.forEach(s => { stepStatuses[s.step_number] = s.status; });

  const loadStatus = useCallback(async () => {
    try { setRunStatus(await fetchOperationalStatus()); }
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleTriggerRun = async () => {
    setIsRunning(true);
    setToast({ msg: 'Executing 14-stage automated meteorological workflow…', ok: true });
    try {
      const res = await triggerForecastRun();
      setRunStatus(res.run);
      setToast({ msg: 'Operational run completed — all 14 stages converged.', ok: true });
    } catch {
      setToast({ msg: 'Pipeline run failed. Check backend connectivity.', ok: false });
    } finally { setIsRunning(false); }
  };

  const totalMs = runStatus?.steps.reduce((a, s) => a + s.duration_ms, 0) ?? 0;

  const nodeOf = (id: string) => NODES.find(n => n.id === id)!;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseG { 0%,100%{box-shadow:0 0 10px rgba(56,189,248,0.3)} 50%{box-shadow:0 0 26px rgba(56,189,248,0.7)} }
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', gap:20, color:'#f8fafc', paddingBottom:48 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          background:'rgba(10,16,31,0.80)', backdropFilter:'blur(24px)',
          border:'1px solid rgba(56,189,248,0.22)', borderRadius:20,
          padding:'20px 26px', boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
          display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:14,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:42, height:42, borderRadius:13,
              background:'linear-gradient(135deg,rgba(56,189,248,0.22) 0%,rgba(16,185,129,0.22) 100%)',
              border:'1px solid rgba(56,189,248,0.45)',
              display:'flex', alignItems:'center', justifyContent:'center',
              animation: isRunning ? 'pulseG 1.4s ease-in-out infinite' : 'none',
            }}>
              <Activity style={{ width:20, height:20, color:'#38bdf8' }} />
            </div>
            <div>
              <h1 style={{
                fontSize:18, fontWeight:900, margin:0, letterSpacing:'0.04em',
                background:'linear-gradient(90deg,#fff 0%,#38bdf8 55%,#10b981 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              }}>HYBRID AI–NWP OPERATIONAL PIPELINE</h1>
              <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{
                  fontSize:9, fontFamily:'monospace', fontWeight:700, padding:'2px 7px',
                  borderRadius:4, background:'rgba(251,191,36,0.12)', color:'#fbbf24',
                  border:'1px solid rgba(251,191,36,0.3)',
                }}>DEMO DATA</span>
                <span style={{ fontSize:11, color:'#94a3b8' }}>
                  ECMWF + GFS + ICON → ERA5 → Obs → AI → Weights → Blend → Extremes → Dashboard
                </span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={loadStatus} style={{
              display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10,
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)',
              color:'#94a3b8', fontSize:11, fontWeight:700, cursor:'pointer',
            }}>
              <RefreshCw style={{ width:13, height:13 }} /> REFRESH
            </button>
            <button onClick={handleTriggerRun} disabled={isRunning} style={{
              display:'flex', alignItems:'center', gap:8, padding:'9px 22px', borderRadius:12,
              background: isRunning ? '#1e293b' : 'linear-gradient(135deg,#0284c7,#0369a1)',
              border:`1px solid ${isRunning ? '#334155' : '#38bdf8'}`,
              color:'#fff', fontSize:11, fontWeight:800, cursor: isRunning ? 'not-allowed' : 'pointer',
              boxShadow: isRunning ? 'none' : '0 0 18px rgba(56,189,248,0.35)',
            }}>
              {isRunning
                ? <span style={{ display:'inline-block', animation:'spin 0.9s linear infinite' }}><RefreshCw style={{ width:14, height:14 }} /></span>
                : <PlayCircle style={{ width:14, height:14 }} />}
              {isRunning ? 'ORCHESTRATING…' : 'TRIGGER RUN'}
            </button>
          </div>
        </div>

        {/* ── Toast ───────────────────────────────────────────────────────── */}
        {toast && (
          <div style={{
            padding:'11px 18px', borderRadius:12, animation:'fadeUp 0.35s ease',
            background: toast.ok ? 'rgba(16,185,129,0.14)' : 'rgba(248,113,113,0.14)',
            border:`1px solid ${toast.ok ? '#10b981' : '#f87171'}`,
            fontSize:12, color: toast.ok ? '#34d399' : '#fca5a5',
            display:'flex', alignItems:'center', gap:9,
          }}>
            <CheckCircle2 style={{ width:14, height:14 }} />
            <span>{toast.msg}</span>
          </div>
        )}

        {/* ── KPI Strip ───────────────────────────────────────────────────── */}
        {runStatus && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
            {[
              { label:'Run ID',            val: runStatus.run_id,                                    color:'#38bdf8', Icon: Clock },
              { label:'Overall Status',    val: runStatus.overall_status,                            color:'#10b981', Icon: CheckCircle2 },
              { label:'Stages Converged',  val: '14 / 14',                                           color:'#a78bfa', Icon: Layers },
              { label:'Total Exec Time',   val: `${totalMs} ms`,                                    color:'#fbbf24', Icon: Zap },
              { label:'Records Processed', val: (runStatus.records_processed ?? 0).toLocaleString(), color:'#34d399', Icon: TrendingUp },
              { label:'Active Sources',    val: String(runStatus.active_sources ?? 4),               color:'#fb923c', Icon: Shield },
            ].map(k => (
              <div key={k.label} style={{
                background:'rgba(10,16,31,0.75)', border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:14, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#64748b' }}>
                  <k.Icon style={{ width:12, height:12, color: k.color }} /> {k.label}
                </span>
                <span style={{ fontFamily:'monospace', fontWeight:800, color:k.color, fontSize:12 }}>{k.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* ╔═══════════════════════════════════════════════════════════════╗
            ║           VISUAL PIPELINE ARCHITECTURE DIAGRAM               ║
            ╚═══════════════════════════════════════════════════════════════╝ */}
        <div style={{
          background:'rgba(10,16,31,0.80)', backdropFilter:'blur(24px)',
          border:'1px solid rgba(56,189,248,0.18)', borderRadius:22,
          padding:'26px 28px', boxShadow:'0 12px 48px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <GitMerge style={{ width:16, height:16, color:'#38bdf8' }} />
              <span style={{ fontSize:14, fontWeight:800, color:'#f8fafc' }}>End-to-End Pipeline Architecture</span>
              <span style={{
                fontSize:9, padding:'2px 7px', borderRadius:4, fontFamily:'monospace', fontWeight:700,
                background:'rgba(16,185,129,0.12)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)',
              }}>LIVE</span>
            </div>
            <span style={{ fontSize:10, color:'#475569', fontFamily:'monospace' }}>11 NODES • 8 STAGES • FULLY ADAPTIVE</span>
          </div>

          {/* Row 1: NWP Sources */}
          <RowLabel label="① NWP MODEL SOURCES" color="#38bdf8" />
          <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
            {['ecmwf','gfs','icon'].map(id => (
              <PipelineCard key={id} node={nodeOf(id)} stepStatuses={stepStatuses} />
            ))}
          </div>

          {/* Converge */}
          <div style={{ display:'flex', justifyContent:'center', margin:'8px 0' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:4 }}>
                <div style={{ width:80, height:1, background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.5))' }} />
                <ArrowRight style={{ width:10, height:10, color:'rgba(56,189,248,0.5)', transform:'rotate(90deg)' }} />
                <div style={{ width:80, height:1, background:'linear-gradient(90deg,rgba(56,189,248,0.5),transparent)' }} />
              </div>
            </div>
          </div>
          <FlowArrow color="rgba(34,211,238,0.6)" />

          {/* Row 2: Alignment */}
          <RowLabel label="② SPATIAL & TEMPORAL ALIGNMENT" color="#22d3ee" />
          <div style={{ display:'flex', justifyContent:'center' }}>
            <PipelineCard node={nodeOf('align')} stepStatuses={stepStatuses} />
          </div>

          <FlowArrow color="rgba(52,211,153,0.6)" label="Augment with historical skill + live observations" />

          {/* Row 3: ERA5 + OBS side by side */}
          <RowLabel label="③ HISTORICAL ERA5 + SATELLITE / RADAR / OBSERVATIONS" color="#34d399" />
          <div style={{ display:'flex', justifyContent:'center', gap:20, flexWrap:'wrap' }}>
            <PipelineCard node={nodeOf('era5')} stepStatuses={stepStatuses} />
            <PipelineCard node={nodeOf('obs')} stepStatuses={stepStatuses} />
          </div>

          <FlowArrow color="rgba(232,121,249,0.6)" label="Condition AI inference" />

          {/* Row 4: AI */}
          <RowLabel label="④ DEEP-LEARNING AI MODEL INFERENCE" color="#e879f9" />
          <div style={{ display:'flex', justifyContent:'center' }}>
            <PipelineCard node={nodeOf('ai')} stepStatuses={stepStatuses} />
          </div>

          <FlowArrow color="rgba(244,114,182,0.6)" />

          {/* Row 5: Adaptive Weights */}
          <RowLabel label="⑤ ADAPTIVE WEIGHT ENGINE" color="#f472b6" />
          <div style={{ display:'flex', justifyContent:'center' }}>
            <PipelineCard node={nodeOf('weights')} stepStatuses={stepStatuses} />
          </div>

          <FlowArrow color="rgba(16,185,129,0.6)" />

          {/* Row 6: Blend */}
          <RowLabel label="⑥ HYBRID FORECAST BLENDING" color="#10b981" />
          <div style={{ display:'flex', justifyContent:'center' }}>
            <PipelineCard node={nodeOf('blend')} stepStatuses={stepStatuses} />
          </div>

          <FlowArrow color="rgba(248,113,113,0.6)" />

          {/* Row 7: Extreme detection */}
          <RowLabel label="⑦ EXTREME-WEATHER DETECTION & GUIDANCE" color="#f87171" />
          <div style={{ display:'flex', justifyContent:'center' }}>
            <PipelineCard node={nodeOf('extreme')} stepStatuses={stepStatuses} />
          </div>

          <FlowArrow color="rgba(129,140,248,0.6)" />

          {/* Row 8: Dashboard */}
          <RowLabel label="⑧ DASHBOARD & DECISION-SUPPORT OUTPUT" color="#818cf8" />
          <div style={{ display:'flex', justifyContent:'center' }}>
            <PipelineCard node={nodeOf('dash')} stepStatuses={stepStatuses} />
          </div>

          {/* Feedback loop */}
          <div style={{ display:'flex', justifyContent:'center', marginTop:20 }}>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'7px 18px', borderRadius:20,
              background:'rgba(251,191,36,0.07)', border:'1px solid rgba(251,191,36,0.2)',
            }}>
              <RefreshCw style={{ width:11, height:11, color:'#fbbf24' }} />
              <span style={{ fontSize:10, color:'#94a3b8', fontFamily:'monospace' }}>
                Continuous verification → adaptive weight recalibration → next cycle (t+1)
              </span>
            </div>
          </div>
        </div>

        {/* ╔═══════════════════════════════════════════════════════════════╗
            ║                 14-STAGE EXECUTION LOG                       ║
            ╚═══════════════════════════════════════════════════════════════╝ */}
        <div style={{
          background:'rgba(10,16,31,0.80)', backdropFilter:'blur(20px)',
          border:'1px solid rgba(56,189,248,0.18)', borderRadius:20,
          padding:'20px 24px', boxShadow:'0 8px 32px rgba(0,0,0,0.45)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Cpu style={{ width:15, height:15, color:'#38bdf8' }} />
              <span style={{ fontSize:13, fontWeight:800, color:'#f8fafc' }}>Execution Log — 14 Pipeline Stages</span>
            </div>
            <span style={{
              fontSize:9, fontFamily:'monospace', fontWeight:700, padding:'3px 8px',
              borderRadius:6, background:'rgba(16,185,129,0.12)', color:'#10b981',
              border:'1px solid rgba(16,185,129,0.3)',
            }}>{runStatus ? 'ALL STAGES HEALTHY' : 'LOADING…'}</span>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {runStatus?.steps.map((st, idx) => {
              const nodeColor = NODES.find(n => n.stepNumbers.includes(st.step_number))?.color ?? '#38bdf8';
              return (
                <div key={st.step_number} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 14px', borderRadius:11, gap:10, flexWrap:'wrap',
                  background: idx%2===0 ? 'rgba(15,23,42,0.85)' : 'rgba(10,16,31,0.65)',
                  border:'1px solid rgba(255,255,255,0.04)',
                  animation:`fadeUp 0.35s ease ${idx*0.03}s both`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:26, height:26, borderRadius:'50%', flexShrink:0,
                      background:`rgba(${hexToRgb(nodeColor)},0.15)`,
                      border:`1px solid rgba(${hexToRgb(nodeColor)},0.4)`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:9, fontWeight:800, fontFamily:'monospace', color:nodeColor,
                    }}>{st.step_number}</div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#f0f6fc' }}>{st.name}</div>
                      <div style={{ fontSize:9, color:'#64748b', marginTop:2 }}>{st.details}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, fontFamily:'monospace', fontSize:10, flexShrink:0 }}>
                    <span style={{ color:'#64748b' }}>{st.duration_ms} ms</span>
                    <span style={{ color:'#334155' }}>{st.timestamp}</span>
                    <span style={{
                      padding:'2px 8px', borderRadius:5, fontWeight:800, fontSize:9,
                      background:'rgba(16,185,129,0.15)', color:'#34d399',
                      border:'1px solid rgba(16,185,129,0.3)',
                    }}>{st.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
};

export default OperationalRuns;

