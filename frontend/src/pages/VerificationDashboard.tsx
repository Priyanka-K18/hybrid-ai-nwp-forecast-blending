import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  ArrowRight,
  Layers,
  Database,
  Sliders,
  Sparkles,
  Check,
  RotateCcw,
  Activity,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { fetchVerificationHistory, triggerVerificationRun } from '../services/api';
import { VerificationCycleResult } from '../types';

export const VerificationDashboard: React.FC = () => {
  const [history, setHistory] = useState<VerificationCycleResult[]>([]);
  const [activeCycle, setActiveCycle] = useState<VerificationCycleResult | null>(null);
  const [skillCache, setSkillCache] = useState<Record<string, Record<string, number>>>({});
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Manual Test Observation Inputs
  const [testRegion, setTestRegion] = useState('karnataka');
  const [testVariable, setTestVariable] = useState('rainfall');
  const [testObs, setTestObs] = useState(48.5);
  const [testNwp, setTestNwp] = useState(54.0);
  const [testEns, setTestEns] = useState(49.2);
  const [testAi, setTestAi] = useState(46.0);
  const [testBlend, setTestBlend] = useState(48.0);

  const loadVerification = async () => {
    try {
      const data = await fetchVerificationHistory(15);
      setHistory(data.cycles);
      setSkillCache(data.current_skill_cache);
      if (data.cycles.length > 0) {
        setActiveCycle(data.cycles[data.cycles.length - 1]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadVerification();
  }, []);

  const handleSimulateCycle = async () => {
    setIsReplaying(true);
    setStatusMessage('Replaying historical cycle: Ingesting actual ground observation...');
    try {
      const res = await triggerVerificationRun({
        region: testRegion,
        variable: testVariable,
        lead_time: 24,
        observation: testObs,
        nwp_forecast: testNwp,
        ensemble_forecast: testEns,
        aiml_forecast: testAi,
        blended_forecast: testBlend,
      });
      setStatusMessage(res.message);
      await loadVerification();
    } catch (err) {
      console.error(err);
      setStatusMessage('Verification execution failed.');
    } finally {
      setIsReplaying(false);
    }
  };

  // Verification error comparison timeline data
  const chartData = history.map((c) => ({
    cycle: c.cycle_id,
    NWP_Error: c.nwp_error,
    Ensemble_Error: c.ensemble_error,
    AI_Error: c.aiml_error,
    Blended_Error: c.blended_error,
  }));

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
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(56,189,248,0.2) 100%)',
            border: '1px solid rgba(16,185,129,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              background: 'linear-gradient(90deg, #ffffff 0%, #34d399 60%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              CONTINUOUS VERIFICATION & BACKTESTING LOOP
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
                Automated Feedback Loop: Actual Observations Recalibrate Dynamic Weighting
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={loadVerification}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)',
            color: '#38bdf8', padding: '7px 14px', borderRadius: 10,
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          SYNC LOG
        </button>
      </div>

      {/* ─── 6-Stage Closed-Loop Architecture ─────────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Closed-Loop Adaptive Recalibration Pipeline
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 1</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>Forecast Issued</div>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>Multi-Model Ingest</span>
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 2</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>Ground Observation</div>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>IMD AWS Network</span>
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 3</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>Error Residuals</div>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>MAE, RMSE, Bias</span>
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 4</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>Skill Cache Update</div>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>Rolling Exponentials</span>
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 5</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>Weight Recalibration</div>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>Inverse Error Scaling</span>
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', textAlign: 'center' }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>STAGE 6</span>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>Continuous Learning</div>
            <span style={{ fontSize: 9, color: '#34d399', fontWeight: 700 }}>Next Run Ready</span>
          </div>
        </div>
      </div>

      {/* ─── Verification Error Residuals Chart ───────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 16, 31, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Historical Verification Error Trend (Absolute Error Residuals)
            </h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Comparing absolute forecast errors across historical verification cycles
            </span>
          </div>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8' }}>LOWER RESIDUAL = HIGHER SKILL</span>
        </div>

        <div style={{ height: 260, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <XAxis dataKey="cycle" stroke="#475569" fontSize={10} />
              <YAxis stroke="#475569" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(10, 16, 31, 0.95)', borderColor: '#38bdf8', borderRadius: 8, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="NWP_Error" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 3 }} name="NWP Error" />
              <Line type="monotone" dataKey="Ensemble_Error" stroke="#10b981" strokeWidth={1.5} dot={{ r: 3 }} name="Ensemble Error" />
              <Line type="monotone" dataKey="AI_Error" stroke="#c084fc" strokeWidth={1.5} dot={{ r: 3 }} name="AI/ML Error" />
              <Line type="monotone" dataKey="Blended_Error" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} name="Blended Error" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Simulator & Historical Cycles Log ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Verification Simulator Form */}
        <div style={{
          background: 'rgba(10, 16, 31, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Interactive Verification Simulator
            </h3>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              Inject actual ground observation to test automated skill learning
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
            <div>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Target Region:</label>
              <input
                type="text" value={testRegion} onChange={(e) => setTestRegion(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', color: '#38bdf8', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Actual Ground Observation (mm):</label>
              <input
                type="number" value={testObs} onChange={(e) => setTestObs(parseFloat(e.target.value))}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #10b981', borderRadius: 8, padding: '6px 10px', color: '#34d399', fontWeight: 800, fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>NWP Forecast:</label>
                <input
                  type="number" value={testNwp} onChange={(e) => setTestNwp(parseFloat(e.target.value))}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '5px 8px', color: '#fbbf24', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Ensemble Forecast:</label>
                <input
                  type="number" value={testEns} onChange={(e) => setTestEns(parseFloat(e.target.value))}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '5px 8px', color: '#34d399', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>AI/ML Forecast:</label>
                <input
                  type="number" value={testAi} onChange={(e) => setTestAi(parseFloat(e.target.value))}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '5px 8px', color: '#c084fc', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Blended Forecast:</label>
                <input
                  type="number" value={testBlend} onChange={(e) => setTestBlend(parseFloat(e.target.value))}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #38bdf8', borderRadius: 6, padding: '5px 8px', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulateCycle}
            disabled={isReplaying}
            style={{
              padding: '9px 16px', borderRadius: 10,
              background: isReplaying ? '#334155' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid #38bdf8', color: '#fff', fontSize: 11, fontWeight: 700,
              cursor: isReplaying ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 0 15px rgba(56,189,248,0.3)',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            {isReplaying ? 'RUNNING VERIFICATION...' : 'INJECT OBSERVATION & RECALIBRATE'}
          </button>

          {statusMessage && (
            <div style={{
              padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.1)',
              border: '1px solid rgba(56,189,248,0.25)', fontSize: 11, color: '#38bdf8',
            }}>
              {statusMessage}
            </div>
          )}
        </div>

        {/* Historical Cycles Feed */}
        <div style={{
          background: 'rgba(10, 16, 31, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
            Historical Verification Telemetry Log
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
            {history.slice(-6).reverse().map((c) => (
              <div
                key={c.cycle_id}
                style={{
                  padding: 10, borderRadius: 10, background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(255,255,255,0.06)', fontSize: 11,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {c.cycle_id} ({c.region})
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                    Obs: {c.observation_value} mm | Blend Err: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{c.blended_error} mm</span>
                  </div>
                </div>

                <span style={{
                  fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                  padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.15)',
                  color: '#34d399', border: '1px solid rgba(16,185,129,0.3)',
                }}>
                  VERIFIED
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationDashboard;
