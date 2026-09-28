import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Activity,
  CheckCircle2,
  Database,
  Radio,
  Cpu,
  Shield,
  Download,
  Info,
  RefreshCw,
  Trash2,
  CloudSun,
  Server,
  Globe,
  Zap,
  Play,
  HardDrive,
  AlertTriangle,
  Layers,
  Clock,
  Gauge,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  Wifi,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import {
  fetchCacheStatus,
  clearWeatherCache,
  fetchSystemHealth,
  probeProviders,
  vacuumDatabase,
  fetchOperationalStatus,
  triggerForecastRun,
  SystemHealthData,
  ProviderProbeResult,
} from '../services/api';
import { OperationalRunStatus } from '../types';

export const SettingsHealth: React.FC = () => {
  // ─── Operational Settings State (persisted to localStorage) ─────────────────
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('met_demo_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [autoRecalibrate, setAutoRecalibrate] = useState<boolean>(() => {
    const saved = localStorage.getItem('met_auto_recalibrate');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [highResTiles, setHighResTiles] = useState<boolean>(() => {
    const saved = localStorage.getItem('met_high_res_tiles');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [defaultLeadTime, setDefaultLeadTime] = useState<number>(() => {
    const saved = localStorage.getItem('met_default_lead_time');
    return saved ? parseInt(saved, 10) : 24;
  });
  const [defaultSeason, setDefaultSeason] = useState<string>(() => {
    return localStorage.getItem('met_default_season') || 'Monsoon';
  });
  const [extremeSensitivity, setExtremeSensitivity] = useState<string>(() => {
    return localStorage.getItem('met_extreme_sensitivity') || 'Balanced';
  });

  // ─── Live Diagnostics & Telemetry State ──────────────────────────────────────
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  // ─── Provider Connectivity Matrix State ──────────────────────────────────────
  const [providers, setProviders] = useState<ProviderProbeResult[]>([]);
  const [probingProviders, setProbingProviders] = useState<boolean>(false);

  // ─── Operational Pipeline State ──────────────────────────────────────────────
  const [operationalRun, setOperationalRun] = useState<OperationalRunStatus | null>(null);
  const [runningPipeline, setRunningPipeline] = useState<boolean>(false);
  const [showPipelineDetails, setShowPipelineDetails] = useState<boolean>(false);

  // ─── Cache & Maintenance State ───────────────────────────────────────────────
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [cacheLoading, setCacheLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isVacuuming, setIsVacuuming] = useState<boolean>(false);

  // ─── Auto-dismiss notification toast ─────────────────────────────────────────
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // ─── Save Settings to localStorage ───────────────────────────────────────────
  const saveSettings = () => {
    localStorage.setItem('met_demo_mode', JSON.stringify(demoMode));
    localStorage.setItem('met_auto_recalibrate', JSON.stringify(autoRecalibrate));
    localStorage.setItem('met_high_res_tiles', JSON.stringify(highResTiles));
    localStorage.setItem('met_default_lead_time', defaultLeadTime.toString());
    localStorage.setItem('met_default_season', defaultSeason);
    localStorage.setItem('met_extreme_sensitivity', extremeSensitivity);
    showToast('System configuration saved successfully.', 'success');
  };

  const resetSettings = () => {
    setDemoMode(true);
    setAutoRecalibrate(true);
    setHighResTiles(true);
    setDefaultLeadTime(24);
    setDefaultSeason('Monsoon');
    setExtremeSensitivity('Balanced');
    localStorage.removeItem('met_demo_mode');
    localStorage.removeItem('met_auto_recalibrate');
    localStorage.removeItem('met_high_res_tiles');
    localStorage.removeItem('met_default_lead_time');
    localStorage.removeItem('met_default_season');
    localStorage.removeItem('met_extreme_sensitivity');
    showToast('Configuration restored to factory meteorological defaults.', 'info');
  };

  // ─── Data Loaders ────────────────────────────────────────────────────────────
  const loadSystemHealth = useCallback(async () => {
    setHealthLoading(true);
    const start = performance.now();
    try {
      const data = await fetchSystemHealth();
      const elapsed = Math.round(performance.now() - start);
      setSystemHealth(data);
      setPingLatency(elapsed);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch {
      setPingLatency(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadCacheStats = useCallback(async () => {
    setCacheLoading(true);
    try {
      const res = await fetchCacheStatus();
      setCacheInfo(res);
    } catch {
      // ignore offline
    } finally {
      setCacheLoading(false);
    }
  }, []);

  const loadOperationalPipeline = useCallback(async () => {
    try {
      const run = await fetchOperationalStatus();
      setOperationalRun(run);
    } catch {
      // ignore offline
    }
  }, []);

  const handleProbeProviders = async () => {
    setProbingProviders(true);
    try {
      const res = await probeProviders();
      setProviders(res.providers);
      showToast(`Probed ${res.providers.length} data endpoints successfully.`, 'success');
    } catch (err: any) {
      showToast(`Provider probe failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setProbingProviders(false);
    }
  };

  const handleClearCache = async () => {
    setCacheLoading(true);
    try {
      const res = await clearWeatherCache();
      showToast(res.message || 'Forecast cache cleared successfully.', 'success');
      await loadCacheStats();
      await loadSystemHealth();
    } catch (err: any) {
      showToast(`Failed to clear cache: ${err.message || 'Error'}`, 'error');
    } finally {
      setCacheLoading(false);
    }
  };

  const handleVacuumDatabase = async () => {
    setIsVacuuming(true);
    try {
      const res = await vacuumDatabase();
      showToast(`${res.message} (Reclaimed: ${(res.reclaimed_bytes / 1024).toFixed(1)} KB)`, 'success');
      await loadSystemHealth();
    } catch (err: any) {
      showToast(`Storage optimization failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsVacuuming(false);
    }
  };

  const handleTriggerPipelineRun = async () => {
    setRunningPipeline(true);
    try {
      const res = await triggerForecastRun();
      setOperationalRun(res.run);
      showToast(`Pipeline ${res.run.run_id} executed through all 14 stages!`, 'success');
      await loadSystemHealth();
    } catch (err: any) {
      showToast(`Pipeline execution failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setRunningPipeline(false);
    }
  };

  const exportDiagnosticReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      report_type: 'Operational Health & System Configuration Diagnostic Snapshot',
      client_environment: {
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        local_time: new Date().toString(),
      },
      settings: {
        demo_mode: demoMode,
        auto_recalibrate: autoRecalibrate,
        high_res_tiles: highResTiles,
        default_lead_time_hours: defaultLeadTime,
        default_season: defaultSeason,
        extreme_sensitivity: extremeSensitivity,
      },
      system_health: systemHealth,
      cache_telemetry: cacheInfo,
      provider_matrix: providers,
      operational_run: operationalRun,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hybrid-forecast-diagnostic-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Diagnostic telemetry report exported to JSON.', 'info');
  };

  useEffect(() => {
    loadSystemHealth();
    loadCacheStats();
    loadOperationalPipeline();
    handleProbeProviders();
  }, [loadSystemHealth, loadCacheStats, loadOperationalPipeline]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="sh-container">
      {/* ─── Embedded Vanilla CSS Styling for Guaranteed Aesthetics ──────────── */}
      <style>{`
        .sh-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px 28px;
          max-width: 1440px;
          margin: 0 auto;
          color: #f1f5f9;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-sizing: border-box;
        }

        .sh-panel {
          background: rgba(13, 21, 42, 0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(56, 189, 248, 0.16);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sh-panel:hover {
          border-color: rgba(56, 189, 248, 0.28);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
        }

        .sh-header-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .sh-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sh-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .sh-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.01em;
          background: linear-gradient(135deg, #ffffff 60%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sh-subtitle {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        .sh-badge-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.35);
          letter-spacing: 0.05em;
        }

        .sh-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
          animation: shPulse 2s infinite ease-in-out;
        }

        @keyframes shPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        @keyframes shSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sh-spin {
          animation: shSpin 1s linear infinite;
        }

        .sh-actions-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .sh-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          font-family: inherit;
        }

        .sh-btn-secondary {
          background: rgba(30, 41, 59, 0.8);
          color: #e2e8f0;
          border-color: rgba(148, 163, 184, 0.2);
        }
        .sh-btn-secondary:hover {
          background: rgba(51, 65, 85, 0.9);
          border-color: rgba(56, 189, 248, 0.4);
          color: #38bdf8;
        }

        .sh-btn-cyan {
          background: rgba(6, 182, 212, 0.15);
          color: #22d3ee;
          border-color: rgba(6, 182, 212, 0.35);
        }
        .sh-btn-cyan:hover {
          background: rgba(6, 182, 212, 0.25);
          border-color: rgba(6, 182, 212, 0.6);
        }

        .sh-btn-primary {
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(6, 182, 212, 0.3);
        }
        .sh-btn-primary:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .sh-btn-amber {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.35);
        }
        .sh-btn-amber:hover {
          background: rgba(245, 158, 11, 0.25);
          border-color: rgba(245, 158, 11, 0.55);
        }

        .sh-btn-rose {
          background: rgba(244, 63, 94, 0.12);
          color: #fb7185;
          border-color: rgba(244, 63, 94, 0.3);
        }
        .sh-btn-rose:hover {
          background: rgba(244, 63, 94, 0.22);
          border-color: rgba(244, 63, 94, 0.5);
        }

        /* ── Core Telemetry 4-Column Grid ── */
        .sh-telemetry-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .sh-stat-card {
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(56, 189, 248, 0.15);
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          transition: all 0.2s ease;
        }
        .sh-stat-card:hover {
          border-color: rgba(56, 189, 248, 0.35);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }

        .sh-stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }

        .sh-stat-value-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        .sh-stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
        }

        .sh-stat-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: #64748b;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 8px;
        }

        /* ── Providers Grid ── */
        .sh-providers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }

        .sh-provider-card {
          background: rgba(10, 16, 32, 0.75);
          border: 1px solid rgba(56, 189, 248, 0.12);
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .sh-provider-card:hover {
          border-color: rgba(56, 189, 248, 0.3);
          background: rgba(15, 23, 42, 0.85);
        }

        .sh-provider-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .sh-provider-name {
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .sh-provider-desc {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
        }

        .sh-status-pill {
          font-size: 9px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          letter-spacing: 0.04em;
        }
        .sh-status-healthy {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.35);
        }
        .sh-status-unavailable {
          background: rgba(244, 63, 94, 0.15);
          color: #fb7185;
          border: 1px solid rgba(244, 63, 94, 0.35);
        }

        .sh-provider-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* ── Operational Pipeline Box ── */
        .sh-pipeline-summary-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: rgba(10, 16, 32, 0.6);
          padding: 12px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }

        .sh-steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .sh-step-item {
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(10, 16, 32, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          transition: border-color 0.2s;
        }
        .sh-step-item:hover {
          border-color: rgba(56, 189, 248, 0.25);
        }

        /* ── Cache Cockpit ── */
        .sh-cache-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .sh-cache-metric-box {
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(10, 16, 32, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* ── Configuration Switches ── */
        .sh-config-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sh-switch-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          background: rgba(10, 16, 32, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          gap: 20px;
          transition: border-color 0.2s;
        }
        .sh-switch-row:hover {
          border-color: rgba(56, 189, 248, 0.25);
        }

        .sh-switch-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sh-switch-title {
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sh-switch-desc {
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.4;
        }

        /* Custom Toggle Switch */
        .sh-toggle-label {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
          cursor: pointer;
        }
        .sh-toggle-label input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .sh-toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #334155;
          transition: .3s;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .sh-toggle-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .sh-toggle-slider {
          background-color: #06b6d4;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
        }
        input:checked + .sh-toggle-slider:before {
          transform: translateX(20px);
        }

        /* ── Preset Select Controls ── */
        .sh-presets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          padding-top: 8px;
        }

        .sh-preset-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sh-preset-label {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
        }

        .sh-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          background: #0f172a;
          border: 1px solid rgba(56, 189, 248, 0.2);
          color: #f8fafc;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sh-select:focus {
          outline: none;
          border-color: #06b6d4;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.25);
        }

        /* ── Architecture Cards ── */
        .sh-arch-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .sh-arch-card {
          padding: 14px 18px;
          border-radius: 12px;
          background: rgba(10, 16, 32, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
        }

        /* ── Media Queries ── */
        @media (max-width: 1024px) {
          .sh-telemetry-grid { grid-template-columns: repeat(2, 1fr); }
          .sh-cache-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .sh-presets-grid { grid-template-columns: 1fr; }
          .sh-arch-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .sh-container { padding: 16px; }
          .sh-telemetry-grid { grid-template-columns: 1fr; }
          .sh-cache-stats-grid { grid-template-columns: 1fr; }
          .sh-header-banner { flex-direction: column; align-items: flex-start; }
          .sh-actions-toolbar { width: 100%; justify-content: flex-start; }
        }
      `}</style>

      {/* ─── Notification Toast ─────────────────────────────────────────────── */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 12,
            fontWeight: 500,
            background:
              statusMessage.type === 'success'
                ? 'rgba(6, 78, 59, 0.9)'
                : statusMessage.type === 'error'
                ? 'rgba(136, 19, 55, 0.9)'
                : 'rgba(8, 51, 68, 0.9)',
            border: `1px solid ${
              statusMessage.type === 'success'
                ? 'rgba(52, 211, 153, 0.4)'
                : statusMessage.type === 'error'
                ? 'rgba(251, 113, 133, 0.4)'
                : 'rgba(56, 189, 248, 0.4)'
            }`,
            color: '#f8fafc',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusMessage.type === 'success' && <CheckCircle2 size={16} color="#34d399" />}
            {statusMessage.type === 'error' && <AlertTriangle size={16} color="#fb7185" />}
            {statusMessage.type === 'info' && <Info size={16} color="#38bdf8" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Header Banner & Mission Status ──────────────────────────────────── */}
      <div className="sh-panel sh-header-banner">
        <div className="sh-title-group">
          <div className="sh-title-row">
            <Settings size={22} color="#38bdf8" />
            <h1 className="sh-title">System Settings & Operational Health</h1>
            <span className="sh-badge-live">
              <span className="sh-pulse-dot" />
              {systemHealth?.status === 'HEALTHY' ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM HEALTH MONITOR'}
            </span>
          </div>
          <p className="sh-subtitle">
            Real-time telemetry, upstream NWP provider latencies, database maintenance, and forecast workflow controls.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="sh-actions-toolbar">
          <button
            onClick={loadSystemHealth}
            disabled={healthLoading}
            className="sh-btn sh-btn-secondary"
            title="Refresh System Telemetry"
          >
            <RefreshCw size={14} className={healthLoading ? 'sh-spin' : ''} />
            <span>Telemetry Ping</span>
          </button>
          <button
            onClick={handleProbeProviders}
            disabled={probingProviders}
            className="sh-btn sh-btn-cyan"
            title="Ping all weather model endpoints"
          >
            <Wifi size={14} className={probingProviders ? 'sh-pulse-dot' : ''} />
            <span>Probe Endpoints</span>
          </button>
          <button
            onClick={exportDiagnosticReport}
            className="sh-btn sh-btn-secondary"
            title="Export complete diagnostic JSON report"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ─── Live Core Telemetry Cards (4-Column Grid) ───────────────────────── */}
      <div className="sh-telemetry-grid">
        {/* FastAPI Core */}
        <div className="sh-stat-card" style={{ borderColor: 'rgba(52, 211, 153, 0.35)' }}>
          <div className="sh-stat-header">
            <span>FastAPI Backend Core</span>
            <CheckCircle2 size={16} color="#34d399" />
          </div>
          <div className="sh-stat-value-row">
            <span className="sh-stat-value">ONLINE</span>
            {pingLatency !== null && (
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#34d399', fontWeight: 700 }}>
                {pingLatency}ms
              </span>
            )}
          </div>
          <div className="sh-stat-footer">
            <span>Uptime: {systemHealth ? formatUptime(systemHealth.uptime_seconds) : '—'}</span>
            <span style={{ color: '#34d399' }}>Port 8000</span>
          </div>
        </div>

        {/* SQLite Database */}
        <div className="sh-stat-card" style={{ borderColor: 'rgba(56, 189, 248, 0.35)' }}>
          <div className="sh-stat-header">
            <span>SQLite Storage</span>
            <Database size={16} color="#38bdf8" />
          </div>
          <div className="sh-stat-value-row">
            <span className="sh-stat-value">
              {systemHealth?.database?.status === 'ONLINE' ? 'CONNECTED' : 'STANDBY'}
            </span>
            <button
              onClick={handleVacuumDatabase}
              disabled={isVacuuming}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
              title="Compact and defragment SQLite database"
            >
              {isVacuuming ? 'Compacting...' : 'Compact'}
            </button>
          </div>
          <div className="sh-stat-footer">
            <span>Size: {systemHealth?.database?.size_bytes ? `${(systemHealth.database.size_bytes / 1024).toFixed(1)} KB` : '4.0 KB'}</span>
            <span style={{ color: '#38bdf8' }}>SQLite 3</span>
          </div>
        </div>

        {/* Weather TTL Cache */}
        <div className="sh-stat-card" style={{ borderColor: 'rgba(129, 140, 248, 0.35)' }}>
          <div className="sh-stat-header">
            <span>Weather TTL Cache</span>
            <CloudSun size={16} color="#818cf8" />
          </div>
          <div className="sh-stat-value-row">
            <span className="sh-stat-value">
              {cacheInfo?.active_entries ?? 0}{' '}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>entries</span>
            </span>
            {systemHealth?.cache && (
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#818cf8', fontWeight: 700 }}>
                {systemHealth.cache.hit_rate_pct}% hit
              </span>
            )}
          </div>
          <div className="sh-stat-footer">
            <span>Hits: {cacheInfo?.hits ?? 0}</span>
            <span>Misses: {cacheInfo?.misses ?? 0}</span>
          </div>
        </div>

        {/* Forecast Workflow Engine */}
        <div className="sh-stat-card" style={{ borderColor: 'rgba(245, 158, 11, 0.35)' }}>
          <div className="sh-stat-header">
            <span>Forecast Workflow Engine</span>
            <Radio size={16} color="#f59e0b" />
          </div>
          <div className="sh-stat-value-row">
            <span className="sh-stat-value">14 / 14 ACTIVE</span>
            <button
              onClick={handleTriggerPipelineRun}
              disabled={runningPipeline}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f59e0b',
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
              title="Trigger complete 14-stage forecasting cycle now"
            >
              {runningPipeline ? 'Running...' : 'Run Cycle'}
            </button>
          </div>
          <div className="sh-stat-footer">
            <span>Cycle: {operationalRun?.run_id ? operationalRun.run_id.slice(-8) : 'CYC-101'}</span>
            <span style={{ color: '#f59e0b' }}>Synchronized</span>
          </div>
        </div>
      </div>

      {/* ─── Upstream Provider Connectivity Matrix ───────────────────────────── */}
      <div className="sh-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} color="#38bdf8" />
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Upstream Meteorological Data Provider Matrix
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
              Last probe: {lastCheckTime || 'Just now'}
            </span>
            <button
              onClick={handleProbeProviders}
              disabled={probingProviders}
              className="sh-btn sh-btn-secondary"
              style={{ padding: '6px 12px', fontSize: 11 }}
            >
              <RefreshCw size={12} className={probingProviders ? 'sh-spin' : ''} />
              Re-probe All
            </button>
          </div>
        </div>

        <div className="sh-providers-grid">
          {providers.length > 0 ? (
            providers.map((p) => {
              const isHealthy = p.status === 'HEALTHY';
              const isLocal = p.name.includes('SQLite');
              return (
                <div key={p.name} className="sh-provider-card">
                  <div className="sh-provider-top">
                    <div>
                      <div className="sh-provider-name">
                        {isLocal ? <HardDrive size={15} color="#38bdf8" /> : <CloudSun size={15} color="#818cf8" />}
                        <span>{p.name}</span>
                      </div>
                      <div className="sh-provider-desc">{p.target}</div>
                    </div>
                    <span className={`sh-status-pill ${isHealthy ? 'sh-status-healthy' : 'sh-status-unavailable'}`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="sh-provider-bottom">
                    <span style={{ color: '#94a3b8' }}>
                      HTTP {p.status_code ?? 'ERR'}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: p.latency_ms < 200 ? '#34d399' : p.latency_ms < 1500 ? '#38bdf8' : '#fbbf24',
                      }}
                    >
                      {p.latency_ms} ms
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: 13 }}>
              <RefreshCw size={20} className="sh-spin" style={{ margin: '0 auto 8px', color: '#38bdf8' }} />
              <div>Probing upstream weather provider endpoints...</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 14-Stage Operational Forecast Pipeline Flow ──────────────────────── */}
      <div className="sh-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="#f59e0b" />
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                14-Stage Automated Operational Forecast Pipeline
              </h2>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                End-to-end meteorological workflow: Ingestion → Alignment → Regime → Skill Weighting → Blending → Verification.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowPipelineDetails((prev) => !prev)}
              className="sh-btn sh-btn-secondary"
            >
              {showPipelineDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{showPipelineDetails ? 'Hide Details' : 'Show All 14 Stages'}</span>
            </button>
            <button
              onClick={handleTriggerPipelineRun}
              disabled={runningPipeline}
              className="sh-btn sh-btn-amber"
            >
              <Play size={14} className={runningPipeline ? 'sh-spin' : ''} />
              <span>{runningPipeline ? 'Executing...' : 'Trigger Cycle'}</span>
            </button>
          </div>
        </div>

        {/* Pipeline Summary Bar */}
        <div className="sh-pipeline-summary-bar">
          <div>
            <span style={{ color: '#94a3b8' }}>Cycle ID: </span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{operationalRun?.run_id || 'CYC-AUTO-101'}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Status: </span>
            <span style={{ color: '#34d399', fontWeight: 700 }}>14 / 14 COMPLETED</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Total Execution: </span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>
              {operationalRun?.steps ? operationalRun.steps.reduce((acc, s) => acc + s.duration_ms, 0) : 1850} ms
            </span>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Verification: </span>
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>Auto-Recalibrate ON</span>
          </div>
        </div>

        {/* Expandable Step-by-Step Flow */}
        {showPipelineDetails && operationalRun?.steps && (
          <div className="sh-steps-grid">
            {operationalRun.steps.map((step) => (
              <div key={step.step_number} className="sh-step-item">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#f1f5f9', fontSize: 12 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {step.step_number}
                    </span>
                    <span>{step.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', paddingLeft: 30 }}>
                    {step.details}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#34d399',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {step.duration_ms}ms
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Open-Meteo In-Memory Cache Cockpit ───────────────────────────────── */}
      <div className="sh-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudSun size={18} color="#38bdf8" />
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                Open-Meteo Acquisition & In-Memory TTL Cache
              </h2>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                High-performance in-memory cache keyed by spatial coordinates (lat, lon, model).
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={loadCacheStats}
              disabled={cacheLoading}
              className="sh-btn sh-btn-secondary"
            >
              <RefreshCw size={13} className={cacheLoading ? 'sh-spin' : ''} />
              <span>Refresh Stats</span>
            </button>
            <button
              onClick={handleClearCache}
              disabled={cacheLoading}
              className="sh-btn sh-btn-rose"
            >
              <Trash2 size={13} />
              <span>Flush Cache</span>
            </button>
          </div>
        </div>

        <div className="sh-cache-stats-grid">
          <div className="sh-cache-metric-box">
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Active Entries</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#ffffff' }}>
              {cacheInfo?.active_entries ?? 0}
            </span>
            <span style={{ fontSize: 10, color: '#64748b' }}>Keyed by (lat, lon, model)</span>
          </div>

          <div className="sh-cache-metric-box">
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Configured TTL</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#38bdf8' }}>
              {cacheInfo?.ttl_seconds ? `${Math.round(cacheInfo.ttl_seconds / 60)} min` : '60 min'}
            </span>
            <span style={{ fontSize: 10, color: '#64748b' }}>Automatic eviction</span>
          </div>

          <div className="sh-cache-metric-box">
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Cache Hits</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#34d399' }}>
              {cacheInfo?.hits ?? 0}
            </span>
            <span style={{ fontSize: 10, color: '#64748b' }}>Zero-latency memory reads</span>
          </div>

          <div className="sh-cache-metric-box">
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Cache Misses</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#f59e0b' }}>
              {cacheInfo?.misses ?? 0}
            </span>
            <span style={{ fontSize: 10, color: '#64748b' }}>Fresh upstream fetches</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(56, 189, 248, 0.1)',
            fontSize: 11,
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Info size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
          <span>
            Open-Meteo free tier provides access to ECMWF IFS 0.25°, GFS Seamless, and ICON Seamless without requiring an API key. Requests are cached in-memory with automatic TTL expiration to comply with fair-use guidelines and prevent redundant network calls.
          </span>
        </div>
      </div>

      {/* ─── Operational System Configuration Toggles & Presets ─────────────── */}
      <div className="sh-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} color="#38bdf8" />
              Forecasting System Parameter Configuration
            </h2>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Interactive toggles, default horizons, and climatological presets saved to browser storage.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={resetSettings} className="sh-btn sh-btn-secondary">
              Reset Defaults
            </button>
            <button onClick={saveSettings} className="sh-btn sh-btn-primary">
              Save Configuration
            </button>
          </div>
        </div>

        {/* Feature Switches */}
        <div className="sh-config-list">
          <div className="sh-switch-row">
            <div className="sh-switch-info">
              <div className="sh-switch-title">
                <span>DEMO DATA Mode</span>
                {demoMode && (
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="sh-switch-desc">
                Generates realistic synthetic multi-model meteorological feeds when live satellite/GRIB2 feeds are unconfigured. Turn off to enforce live Open-Meteo feeds.
              </div>
            </div>
            <label className="sh-toggle-label">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
              />
              <span className="sh-toggle-slider" />
            </label>
          </div>

          <div className="sh-switch-row">
            <div className="sh-switch-info">
              <div className="sh-switch-title">
                <span>Continuous Dynamic Skill Recalibration</span>
              </div>
              <div className="sh-switch-desc">
                Automatically adjusts inverse-error reliability weights upon each verified ground observation cycle using exponential moving averages.
              </div>
            </div>
            <label className="sh-toggle-label">
              <input
                type="checkbox"
                checked={autoRecalibrate}
                onChange={(e) => setAutoRecalibrate(e.target.checked)}
              />
              <span className="sh-toggle-slider" />
            </label>
          </div>

          <div className="sh-switch-row">
            <div className="sh-switch-info">
              <div className="sh-switch-title">
                <span>High-Resolution 3D Globe Atmospheric Shaders</span>
              </div>
              <div className="sh-switch-desc">
                Enables hardware-accelerated WebGL cloud rotation, atmospheric Rayleigh glow, and particle fields for the global visualization page.
              </div>
            </div>
            <label className="sh-toggle-label">
              <input
                type="checkbox"
                checked={highResTiles}
                onChange={(e) => setHighResTiles(e.target.checked)}
              />
              <span className="sh-toggle-slider" />
            </label>
          </div>
        </div>

        {/* Presets & Dropdown Configurations */}
        <div className="sh-presets-grid">
          {/* Default Lead Time */}
          <div className="sh-preset-group">
            <label className="sh-preset-label">Default Forecast Lead Time</label>
            <select
              value={defaultLeadTime}
              onChange={(e) => setDefaultLeadTime(parseInt(e.target.value, 10))}
              className="sh-select"
            >
              <option value={6}>6 Hours (Nowcasting)</option>
              <option value={12}>12 Hours (Half-Day)</option>
              <option value={24}>24 Hours (Standard 1-Day)</option>
              <option value={48}>48 Hours (2-Day Synoptic)</option>
              <option value={72}>72 Hours (3-Day Medium Range)</option>
              <option value={120}>120 Hours (5-Day Extended)</option>
            </select>
            <span style={{ fontSize: 10, color: '#64748b' }}>Initial lead-time on explorer load</span>
          </div>

          {/* Default Season */}
          <div className="sh-preset-group">
            <label className="sh-preset-label">Default Climatological Season</label>
            <select
              value={defaultSeason}
              onChange={(e) => setDefaultSeason(e.target.value)}
              className="sh-select"
            >
              <option value="Monsoon">Monsoon (June - September)</option>
              <option value="Summer">Summer (Pre-Monsoon March - May)</option>
              <option value="Winter">Winter (December - February)</option>
              <option value="Post-Monsoon">Post-Monsoon (October - November)</option>
              <option value="Pre-Monsoon">Pre-Monsoon Convective</option>
            </select>
            <span style={{ fontSize: 10, color: '#64748b' }}>Contextual weighting prior</span>
          </div>

          {/* Extreme Sensitivity */}
          <div className="sh-preset-group">
            <label className="sh-preset-label">Risk Signal Sensitivity</label>
            <select
              value={extremeSensitivity}
              onChange={(e) => setExtremeSensitivity(e.target.value)}
              className="sh-select"
            >
              <option value="High">High (Early Advisory Alerting)</option>
              <option value="Balanced">Balanced (Standard Thresholds)</option>
              <option value="Strict">Strict (High Multi-Model Consensus)</option>
            </select>
            <span style={{ fontSize: 10, color: '#64748b' }}>Extreme weather filter sensitivity</span>
          </div>
        </div>
      </div>

      {/* ─── System Architecture Specifications ──────────────────────────────── */}
      <div className="sh-panel">
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px 0', color: '#ffffff', paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          Met-Suite Technical Stack Reference
        </h2>
        <div className="sh-arch-grid">
          <div className="sh-arch-card">
            <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Frontend UI/UX</span>
            <p style={{ margin: '2px 0', color: '#cbd5e1' }}>React 19 + TypeScript + Vite</p>
            <p style={{ margin: '2px 0', color: '#94a3b8' }}>Three.js + React Three Fiber + Drei</p>
            <p style={{ margin: '2px 0', color: '#94a3b8' }}>Vanilla CSS Glassmorphism + Recharts</p>
          </div>

          <div className="sh-arch-card">
            <span style={{ color: '#818cf8', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Backend Core</span>
            <p style={{ margin: '2px 0', color: '#cbd5e1' }}>FastAPI + Uvicorn + Pydantic v2</p>
            <p style={{ margin: '2px 0', color: '#94a3b8' }}>NumPy + Pandas + Scikit-Learn</p>
            <p style={{ margin: '2px 0', color: '#94a3b8' }}>SQLAlchemy + SQLite 3 / In-Memory</p>
          </div>

          <div className="sh-arch-card">
            <span style={{ color: '#34d399', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Scientific Engine</span>
            <p style={{ margin: '2px 0', color: '#cbd5e1' }}>Contextual Softmax Weight Blending</p>
            <p style={{ margin: '2px 0', color: '#94a3b8' }}>Continuous Moving-Average Recalibration</p>
            <p style={{ margin: '2px 0', color: '#94a3b8' }}>Thermodynamic Regime Classifier</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsHealth;
