/**
 * ExecutiveDashboard.tsx — 3D Global Weather Intelligence Interface
 *
 * Architecture:
 *   Full-viewport interactive 3D Earth (globe.gl / Three.js)
 *   ↓ country / location selection
 *   ↓ Open-Meteo + backend blending engine
 *   ↓ adaptive weights, hybrid forecast, extreme signals
 *   ↓ side panel + KPI strip + search bar
 */
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Region } from '../types';

import GlobeView, { type GlobeHandle, type GlobeLocation, type GlobeWeatherPoint } from '../components/GlobeIntelligence/GlobeView';
import { GlobeHoverTooltip, type HoverData } from '../components/GlobeIntelligence/GlobeHoverTooltip';
import { ForecastIntelligencePanel, type ForecastIntelligenceData } from '../components/GlobeIntelligence/ForecastIntelligencePanel';

import {
  fetchOpenMeteoBlended, fetchOpenMeteoWeights, fetchOpenMeteoExtremes,
  geocodeCity, fetchExtremeAlerts,
} from '../services/api';

import {
  Globe2, Search, RotateCcw, Layers, Zap, Activity,
  AlertTriangle, Wind, Thermometer, Droplets, Brain,
  Settings2, X, ChevronDown,
} from 'lucide-react';

/* ─── Country → lat/lng look-up (major countries, fast) ────────────────── */
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'India':            [20.59, 78.96], 'China':           [35.86, 104.19],
  'United States of America': [37.09, -95.71], 'United States': [37.09, -95.71],
  'Russia':           [61.52, 105.31], 'Brazil':         [-14.23, -51.93],
  'Australia':        [-25.27, 133.77], 'Canada':        [56.13, -106.34],
  'Germany':          [51.16, 10.45], 'France':          [46.22, 2.21],
  'United Kingdom':   [55.37, -3.43], 'Japan':           [36.20, 138.25],
  'Indonesia':        [-0.78, 113.92], 'Pakistan':       [30.37, 69.34],
  'Bangladesh':       [23.68, 90.35], 'Nigeria':         [9.08, 8.67],
  'South Africa':     [-30.56, 22.93], 'Egypt':          [26.82, 30.80],
  'Kenya':            [-0.02, 37.91], 'Saudi Arabia':    [23.88, 45.07],
  'Argentina':        [-38.41, -63.61], 'Mexico':        [23.63, -102.55],
  'Iran':             [32.43, 53.68], 'Thailand':        [15.87, 100.99],
  'Vietnam':          [14.05, 108.27], 'Philippines':    [12.87, 121.77],
};

/* ─── Weather layer definitions ──────────────────────────────────────────── */
type LayerId = 'none' | 'precipitation' | 'temperature' | 'wind' | 'extreme';
const LAYERS: { id: LayerId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'none',          label: 'No Layer',    icon: <Globe2 style={{ width: 12, height: 12 }} />,       color: '#64748b' },
  { id: 'precipitation', label: 'Precip.',     icon: <Droplets style={{ width: 12, height: 12 }} />,     color: '#38bdf8' },
  { id: 'temperature',   label: 'Temp.',       icon: <Thermometer style={{ width: 12, height: 12 }} />,  color: '#fb923c' },
  { id: 'wind',          label: 'Wind',        icon: <Wind style={{ width: 12, height: 12 }} />,         color: '#a78bfa' },
  { id: 'extreme',       label: 'Extremes',    icon: <AlertTriangle style={{ width: 12, height: 12 }} />, color: '#f87171' },
];

/* ─── Known regions for quick-select ─────────────────────────────────────── */
const QUICK_REGIONS = [
  { name: 'Bengaluru', country: 'India', lat: 12.97, lng: 77.59 },
  { name: 'Mumbai',    country: 'India', lat: 19.08, lng: 72.88 },
  { name: 'Delhi',     country: 'India', lat: 28.70, lng: 77.10 },
  { name: 'London',    country: 'UK',    lat: 51.51, lng: -0.12  },
  { name: 'Tokyo',     country: 'Japan', lat: 35.68, lng: 139.69 },
  { name: 'New York',  country: 'USA',   lat: 40.71, lng: -74.01 },
  { name: 'Sydney',    country: 'AUS',   lat: -33.87, lng: 151.21 },
  { name: 'Dubai',     country: 'UAE',   lat: 25.20, lng: 55.27  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export const ExecutiveDashboard: React.FC = () => {
  const { setSelectedRegionId } = useOutletContext<{
    selectedRegionId: string; setSelectedRegionId: (id: string) => void; regions: Region[];
  }>();

  /* Globe ref */
  const globeRef = useRef<GlobeHandle>(null);

  /* UI state */
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<typeof QUICK_REGIONS>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeLayer, setActiveLayer]     = useState<LayerId>('none');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [weatherPoints, setWeatherPoints] = useState<GlobeWeatherPoint[]>([]);

  /* Hover tooltip */
  const [hoverData, setHoverData] = useState<HoverData | null>(null);
  const [hoverPos, setHoverPos]   = useState({ x: 0, y: 0 });

  /* Selected location + forecast */
  const [activeLocation, setActiveLocation]         = useState<GlobeLocation | null>(null);
  const [forecastData, setForecastData]             = useState<ForecastIntelligenceData | null>(null);
  const [forecastLoading, setForecastLoading]       = useState(false);
  const [panelOpen, setPanelOpen]                   = useState(false);

  /* Global stats */
  const [extremeCount, setExtremeCount] = useState(0);
  const [activeRegions, setActiveRegions] = useState(12);

  /* UTC clock */
  const [utcTime, setUtcTime] = useState('');
  const [blip, setBlip] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => {
      setUtcTime(new Date().toUTCString().slice(0, -4));
      setBlip(b => !b);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  /* Load global extreme count on mount */
  useEffect(() => {
    fetchExtremeAlerts().then(a => setExtremeCount(a.length)).catch(() => {});
  }, []);

  /* ── Country hover handler ─────────────────────────────────────────── */
  const handleCountryHover = useCallback((country: string | null, lat: number, lng: number) => {
    if (!country) { setHoverData(null); return; }
    setHoverData({ country, loading: true });
  }, []);

  /* Track mouse position for tooltip */
  useEffect(() => {
    const onMove = (e: MouseEvent) => setHoverPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

/* ─── Global Layer Presets for visual intelligence ────────────────────────── */
const GLOBAL_LAYER_NODES: Record<LayerId, GlobeWeatherPoint[]> = {
  none: [],
  precipitation: [
    { lat: 12.97, lng: 77.59, value: 14.2, type: 'precipitation', label: 'Bengaluru: 14.2 mm/24h (Monsoon)' },
    { lat: 19.08, lng: 72.88, value: 28.5, type: 'precipitation', label: 'Mumbai: 28.5 mm/24h (Heavy)' },
    { lat: 28.70, lng: 77.10, value: 3.1,  type: 'precipitation', label: 'Delhi: 3.1 mm/24h' },
    { lat: 1.35,  lng: 103.82, value: 34.0, type: 'precipitation', label: 'Singapore: 34.0 mm/24h (Tropical)' },
    { lat: 35.68, lng: 139.69, value: 18.4, type: 'precipitation', label: 'Tokyo: 18.4 mm/24h' },
    { lat: 51.51, lng: -0.12,  value: 5.2,  type: 'precipitation', label: 'London: 5.2 mm/24h' },
    { lat: 40.71, lng: -74.01, value: 11.2, type: 'precipitation', label: 'New York: 11.2 mm/24h' },
    { lat: -33.87, lng: 151.21, value: 6.5, type: 'precipitation', label: 'Sydney: 6.5 mm/24h' },
    { lat: -23.55, lng: -46.63, value: 22.1, type: 'precipitation', label: 'São Paulo: 22.1 mm/24h' },
    { lat: 25.20, lng: 55.27,  value: 0.0,  type: 'precipitation', label: 'Dubai: 0.0 mm/24h (Dry)' },
    { lat: -33.92, lng: 18.42, value: 8.0,  type: 'precipitation', label: 'Cape Town: 8.0 mm/24h' },
  ],
  temperature: [
    { lat: 12.97, lng: 77.59, value: 26.4, type: 'temperature', label: 'Bengaluru: 26.4°C' },
    { lat: 19.08, lng: 72.88, value: 30.1, type: 'temperature', label: 'Mumbai: 30.1°C' },
    { lat: 28.70, lng: 77.10, value: 34.8, type: 'temperature', label: 'Delhi: 34.8°C' },
    { lat: 1.35,  lng: 103.82, value: 31.5, type: 'temperature', label: 'Singapore: 31.5°C' },
    { lat: 35.68, lng: 139.69, value: 22.0, type: 'temperature', label: 'Tokyo: 22.0°C' },
    { lat: 51.51, lng: -0.12,  value: 16.2, type: 'temperature', label: 'London: 16.2°C' },
    { lat: 40.71, lng: -74.01, value: 20.4, type: 'temperature', label: 'New York: 20.4°C' },
    { lat: -33.87, lng: 151.21, value: 18.9, type: 'temperature', label: 'Sydney: 18.9°C' },
    { lat: 25.20, lng: 55.27,  value: 38.6, type: 'temperature', label: 'Dubai: 38.6°C (Extreme Heat)' },
    { lat: 30.04, lng: 31.24,  value: 36.2, type: 'temperature', label: 'Cairo: 36.2°C' },
    { lat: 64.14, lng: -21.94, value: 7.2,  type: 'temperature', label: 'Reykjavik: 7.2°C' },
  ],
  wind: [
    { lat: 12.97, lng: 77.59, value: 14.5, type: 'wind', label: 'Bengaluru: 14.5 km/h' },
    { lat: 19.08, lng: 72.88, value: 24.2, type: 'wind', label: 'Mumbai: 24.2 km/h' },
    { lat: 28.70, lng: 77.10, value: 9.8,  type: 'wind', label: 'Delhi: 9.8 km/h' },
    { lat: 51.51, lng: -0.12,  value: 29.5, type: 'wind', label: 'London: 29.5 km/h' },
    { lat: 40.71, lng: -74.01, value: 21.0, type: 'wind', label: 'New York: 21.0 km/h' },
    { lat: 64.14, lng: -21.94, value: 52.0, type: 'wind', label: 'Reykjavik: 52.0 km/h (Gale Warning)' },
    { lat: -33.92, lng: 18.42, value: 38.2, type: 'wind', label: 'Cape Town: 38.2 km/h' },
    { lat: 35.68, lng: 139.69, value: 16.4, type: 'wind', label: 'Tokyo: 16.4 km/h' },
  ],
  extreme: [
    { lat: 19.08, lng: 72.88, value: 85.0, type: 'extreme', label: 'Mumbai: Extreme Monsoon Surge (Level 3)' },
    { lat: 26.20, lng: 92.94, value: 92.0, type: 'extreme', label: 'Assam: Brahmaputra River Basin Flood Alert' },
    { lat: 25.20, lng: 55.27, value: 75.0, type: 'extreme', label: 'Dubai: Severe Thermal Heatwave Advisory' },
    { lat: 64.14, lng: -21.94, value: 88.0, type: 'extreme', label: 'North Atlantic: Sub-polar Cyclone Alert' },
    { lat: 13.08, lng: 80.27, value: 70.0, type: 'extreme', label: 'Bay of Bengal: Deep Atmospheric Depression' },
  ],
};

  /* ── Fetch forecast for a lat/lng location ─────────────────────────── */
  const fetchForecastForLocation = useCallback(async (
    lat: number, lng: number,
    cityName: string, countryName?: string,
  ) => {
    setForecastLoading(true);
    setPanelOpen(true);
    setForecastData({
      location: { world: 'Earth', country: countryName ?? cityName, city: cityName },
      latitude: lat, longitude: lng,
    });

    try {
      const loc = { latitude: lat, longitude: lng };
      const [blended, weights, extremes] = await Promise.allSettled([
        fetchOpenMeteoBlended(loc, 24, 'Monsoon'),
        fetchOpenMeteoWeights('precipitation', 24, 'Monsoon', 'Normal'),
        fetchOpenMeteoExtremes(loc, 'Monsoon'),
      ]);

      const b  = blended.status  === 'fulfilled' ? blended.value  : null;
      const w  = weights.status  === 'fulfilled' ? weights.value  : null;
      const ex = extremes.status === 'fulfilled' ? extremes.value : null;

      const bSummary = b?.blended_forecast?.blended_summary;
      const bModels = b?.models;
      const bWeights = b?.weights?.precipitation ?? w?.weights;

      // Build weather points for globe layer
      if (b && activeLayer !== 'none') {
        const val = activeLayer === 'temperature' ? (bSummary?.temperature_mean ?? 25)
                  : activeLayer === 'wind'        ? (bSummary?.wind_speed_mean ?? 15)
                  : (bSummary?.precipitation_total ?? 0);
        const newPoints: GlobeWeatherPoint[] = [{ lat, lng, value: val, type: activeLayer as any, label: `${cityName}: ${val}` }];
        setWeatherPoints(prev => [...prev.filter(p => p.label?.indexOf(cityName) === -1), ...newPoints]);
      }

      // Calculate model disagreement from actual values
      const mv = bModels ? {
        ecmwf: bModels.ecmwf?.precipitation_total ?? bModels.ECMWF?.precipitation_total ?? 0,
        gfs:   bModels.gfs?.precipitation_total   ?? bModels.GFS?.precipitation_total   ?? 0,
        icon:  bModels.icon?.precipitation_total  ?? bModels.ICON?.precipitation_total  ?? 0,
        ai:    bSummary?.precipitation_total ?? 0,
      } : undefined;

      let disagreement: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;
      if (mv) {
        const vals = Object.values(mv).filter((v): v is number => typeof v === 'number');
        if (vals.length > 0) {
          const spread = Math.max(...vals) - Math.min(...vals);
          const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
          const rel = mean > 0 ? spread / mean : 0;
          disagreement = rel > 0.4 ? 'HIGH' : rel > 0.2 ? 'MEDIUM' : 'LOW';
        }
      }

      const exSignals: any[] = ex?.signals ?? b?.extreme_signals ?? [];
      const hasExtremes = (ex?.is_extreme ?? false) || (Array.isArray(exSignals) && exSignals.length > 0);

      // Extract weights properly
      const rawEcmwf = bWeights?.ECMWF ?? bWeights?.ecmwf ?? w?.weights?.nwp ?? 0.35;
      const rawGfs   = bWeights?.GFS   ?? bWeights?.gfs   ?? w?.weights?.ensemble ?? 0.25;
      const rawIcon  = bWeights?.ICON  ?? bWeights?.icon  ?? 0.20;
      const rawAi    = bWeights?.AI    ?? bWeights?.ai    ?? w?.weights?.aiml ?? 0.20;
      const totalW   = rawEcmwf + rawGfs + rawIcon + rawAi;

      const fd: ForecastIntelligenceData = {
        location: {
          world: 'Earth',
          continent: getContinent(countryName ?? ''),
          country: countryName,
          city: cityName,
        },
        latitude: lat,
        longitude: lng,
        temperature_c:   bSummary?.temperature_mean ?? b?.current?.temperature_2m,
        rainfall_mm:     bSummary?.precipitation_total ?? b?.blended?.rainfall_mm,
        wind_speed_kmh:  bSummary?.wind_speed_mean ?? b?.current?.wind_speed_10m,
        humidity_pct:    bSummary?.humidity_mean ?? b?.current?.relative_humidity_2m,
        pressure_hpa:    bSummary?.pressure_mean,
        regime:          b?.request?.weather_regime_detected ?? b?.weather_regime ?? ex?.detected_regime ?? 'Normal',
        regime_confidence: b?.blended_forecast?.regime_confidence ?? 84,
        confidence_pct:  b?.blended_forecast?.confidence_pct ?? 88,
        confidence_level: b?.blended_forecast?.confidence_level ?? 'High',
        risk_level:      ex?.risk_level ?? (hasExtremes ? 'Moderate' : 'Low'),
        is_extreme:      hasExtremes,
        extreme_signals: Array.isArray(exSignals)
          ? exSignals.map((s: any) => typeof s === 'string' ? s : (s.description ?? s.signal ?? JSON.stringify(s)))
          : [],
        weights: {
          ecmwf: totalW > 0 ? rawEcmwf / totalW : 0.35,
          gfs:   totalW > 0 ? rawGfs   / totalW : 0.25,
          icon:  totalW > 0 ? rawIcon  / totalW : 0.20,
          ai:    totalW > 0 ? rawAi    / totalW : 0.20,
        },
        model_disagreement: disagreement,
        model_values:    mv,
        hybrid_rainfall: bSummary?.precipitation_total ?? b?.blended?.rainfall_mm,
        is_demo:         false,
        error: blended.status === 'rejected' ? 'Forecast data temporarily unavailable.' : undefined,
      };

      setForecastData(fd);
    } catch (e) {
      setForecastData(prev => prev ? { ...prev, error: 'Forecast data temporarily unavailable.' } : null);
    } finally {
      setForecastLoading(false);
    }
  }, [activeLayer]);

  /* ── Country click handler ─────────────────────────────────────────── */
  const handleCountryClick = useCallback((country: string, lat: number, lng: number) => {
    const coords = COUNTRY_COORDS[country];
    const clat = coords?.[0] ?? lat;
    const clng = coords?.[1] ?? lng;
    const loc: GlobeLocation = { lat: clat, lng: clng, name: country, altitude: 1.8 };
    setActiveLocation(loc);
    globeRef.current?.flyTo(loc);
    fetchForecastForLocation(clat, clng, country, country);
    setHoverData(null);
  }, [fetchForecastForLocation]);

  /* ── Search ─────────────────────────────────────────────────────────── */
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }

    // First match against quick regions
    const quick = QUICK_REGIONS.filter(r =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.country.toLowerCase().includes(q.toLowerCase())
    );
    if (quick.length > 0) { setSearchResults(quick); return; }

    // Geocode via backend
    setSearchLoading(true);
    try {
      const geo = await geocodeCity(q);
      if (geo) {
        setSearchResults([{ name: geo.name, country: geo.country, lat: geo.latitude, lng: geo.longitude }]);
      } else {
        setSearchResults([]);
      }
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  }, []);

  const selectLocation = useCallback((r: { name: string; country: string; lat: number; lng: number }) => {
    const loc: GlobeLocation = { lat: r.lat, lng: r.lng, name: r.name, altitude: 1.2 };
    setActiveLocation(loc);
    globeRef.current?.flyTo(loc);
    fetchForecastForLocation(r.lat, r.lng, r.name, r.country);
    setSearchQuery('');
    setSearchResults([]);
  }, [fetchForecastForLocation]);

  /* ── Globe reset ──────────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    globeRef.current?.reset();
    setActiveLocation(null);
    setPanelOpen(false);
    setForecastData(null);
    setWeatherPoints([]);
    setHoverData(null);
  }, []);

  /* ── CSS ─────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes breathe { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes gridDrift {
          0%{background-position:0 0} 100%{background-position:60px 60px}
        }
        @keyframes globeGlow {
          0%,100%{box-shadow:0 0 60px rgba(56,189,248,0.12),0 0 120px rgba(99,102,241,0.06)}
          50%{box-shadow:0 0 80px rgba(56,189,248,0.20),0 0 160px rgba(99,102,241,0.10)}
        }
        .globe-wrapper { animation: globeGlow 5s ease-in-out infinite; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.25); border-radius: 4px; }
      `}</style>

      {/* ── Full-viewport container ──────────────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(56,189,248,0.06) 0%, #050810 55%)',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Ambient grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'gridDrift 12s linear infinite',
        }} />

        {/* ── TOP COMMAND BAR ──────────────────────────────────────── */}
        <div style={{
          position: 'relative', zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '10px 20px',
          background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(56,189,248,0.12)',
          flexShrink: 0,
        }}>
          {/* Logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(135deg,rgba(56,189,248,0.22),rgba(99,102,241,0.22))',
              border: '1px solid rgba(56,189,248,0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Globe2 style={{ width: 18, height: 18, color: '#38bdf8' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                GLOBAL WEATHER INTELLIGENCE
              </div>
              <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.08em' }}>
                HYBRID AI–NWP FORECASTING SYSTEM
              </div>
            </div>
          </div>

          {/* ── Search ─────────────────────────────────────────────── */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(56,189,248,0.22)',
              borderRadius: 10, padding: '8px 14px',
            }}>
              {searchLoading
                ? <RefreshIcon />
                : <Search style={{ width: 14, height: 14, color: '#475569', flexShrink: 0 }} />
              }
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search city, country or coordinates…"
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: '#f8fafc', fontSize: 12, width: '100%',
                }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>

            {/* Search dropdown */}
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 99,
                background: 'rgba(7,11,20,0.96)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(56,189,248,0.22)', borderRadius: 10, overflow: 'hidden',
              }}>
                {searchResults.map(r => (
                  <button key={r.name} onClick={() => selectLocation(r)} style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    color: '#f8fafc', fontSize: 12, fontWeight: 600,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <span style={{ fontSize: 14 }}>📍</span>
                    <div>
                      <div>{r.name}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>{r.country}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right controls ─────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Layer picker */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowLayerMenu(m => !m)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                background: activeLayer !== 'none' ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeLayer !== 'none' ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.10)'}`,
                color: activeLayer !== 'none' ? '#38bdf8' : '#94a3b8',
                fontSize: 11, fontWeight: 700,
              }}>
                <Layers style={{ width: 13, height: 13 }} />
                {LAYERS.find(l => l.id === activeLayer)?.label ?? 'Layers'}
                <ChevronDown style={{ width: 11, height: 11 }} />
              </button>
              {showLayerMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 99,
                  background: 'rgba(7,11,20,0.96)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(56,189,248,0.20)', borderRadius: 10, overflow: 'hidden', minWidth: 140,
                }}>
                  {LAYERS.map(l => (
                    <button key={l.id} onClick={() => {
                      setActiveLayer(l.id);
                      setWeatherPoints(GLOBAL_LAYER_NODES[l.id] || []);
                      setShowLayerMenu(false);
                    }} style={{
                      width: '100%', textAlign: 'left', background: l.id === activeLayer ? 'rgba(56,189,248,0.1)' : 'none',
                      border: 'none', padding: '9px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.04)',
                      color: l.id === activeLayer ? l.color : '#94a3b8', fontSize: 11, fontWeight: 600,
                    }}>
                      <span style={{ color: l.color }}>{l.icon}</span> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset globe */}
            <button onClick={handleReset} title="Reset Globe" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
              color: '#94a3b8', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            }}>
              <RotateCcw style={{ width: 13, height: 13 }} /> RESET GLOBE
            </button>

            {/* Live clock */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
              fontSize: 10, fontFamily: 'monospace', color: '#64748b',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'breathe 1s ease-in-out infinite' }} />
              <span style={{ color: blip ? '#38bdf8' : '#475569', transition: 'color 0.1s' }}>{utcTime.slice(0,-4)} UTC</span>
            </div>
          </div>
        </div>

        {/* ── MAIN AREA: GLOBE + PANEL ─────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>

          {/* Globe canvas — full area */}
          <div className="globe-wrapper" style={{
            position: 'absolute', inset: 0, zIndex: 1,
          }}>
            <GlobeView
              ref={globeRef}
              onCountryHover={handleCountryHover}
              onCountryClick={handleCountryClick}
              weatherPoints={weatherPoints}
              activeLocation={activeLocation}
            />
          </div>

          {/* ── Global Intelligence KPI strip (bottom) ──────────── */}
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, display: 'flex', gap: 10, animation: 'fadeUp 0.5s ease',
          }}>
            {[
              { label: 'Active Regions',    val: activeRegions,          color: '#34d399', icon: <Activity style={{ width: 12, height: 12 }} /> },
              { label: 'Extreme Signals',   val: extremeCount,           color: '#f87171', icon: <AlertTriangle style={{ width: 12, height: 12 }} /> },
              { label: 'Models Online',     val: 4,                      color: '#a78bfa', icon: <Brain style={{ width: 12, height: 12 }} /> },
              { label: 'Blend Engine',      val: 'ACTIVE',               color: '#38bdf8', icon: <Zap style={{ width: 12, height: 12 }} /> },
            ].map(k => (
              <div key={k.label} style={{
                background: 'rgba(5,8,16,0.82)', backdropFilter: 'blur(18px)',
                border: `1px solid rgba(${hexRgb(k.color)},0.25)`,
                borderRadius: 12, padding: '8px 14px',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
              }}>
                <span style={{ color: k.color }}>{k.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: k.color, fontFamily: 'monospace', lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: 8, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Quick region pills (left side) ─────────────────── */}
          <div style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 8, color: '#334155', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>QUICK SELECT</div>
            {QUICK_REGIONS.map(r => (
              <button key={r.name} onClick={() => selectLocation(r)} style={{
                padding: '5px 11px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                background: activeLocation?.name === r.name ? 'rgba(56,189,248,0.18)' : 'rgba(5,8,16,0.70)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${activeLocation?.name === r.name ? 'rgba(56,189,248,0.45)' : 'rgba(255,255,255,0.08)'}`,
                color: activeLocation?.name === r.name ? '#38bdf8' : '#94a3b8',
                fontSize: 11, fontWeight: 700, transition: 'all 0.2s',
                boxShadow: activeLocation?.name === r.name ? '0 0 12px rgba(56,189,248,0.25)' : 'none',
              }}>
                {r.name}
              </button>
            ))}
          </div>

          {/* ── Forecast Intelligence Panel (right slide-in) ─────── */}
          {panelOpen && (
            <div style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              zIndex: 15,
            }}>
              <ForecastIntelligencePanel
                data={forecastData}
                loading={forecastLoading}
                onClose={() => setPanelOpen(false)}
              />
            </div>
          )}

          {/* ── Zoom level indicator (top-right of globe) ────────── */}
          <div style={{
            position: 'absolute', top: 14, right: panelOpen ? 372 : 16,
            zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4,
            transition: 'right 0.3s ease',
          }}>
            <ZoomHint />
          </div>

          {/* Compass rose (bottom right) */}
          <div style={{
            position: 'absolute', bottom: 20, right: panelOpen ? 372 : 16,
            zIndex: 10, opacity: 0.45,
            transition: 'right 0.3s ease',
          }}>
            <CompassRose />
          </div>
        </div>
      </div>

      {/* ── Hover tooltip (portal-style, fixed position) ─────────── */}
      <GlobeHoverTooltip data={hoverData} x={hoverPos.x} y={hoverPos.y} />
    </>
  );
};

/* ─── Tiny utility components ─────────────────────────────────────────────── */
const RefreshIcon: React.FC = () => (
  <RotateCcw style={{ width: 14, height: 14, color: '#38bdf8', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
);

const ZoomHint: React.FC = () => (
  <div style={{
    background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
    padding: '8px 12px', fontSize: 9, color: '#475569',
    fontFamily: 'monospace', letterSpacing: '0.06em', lineHeight: 1.8,
  }}>
    <div style={{ color: '#64748b', fontWeight: 700, marginBottom: 4 }}>ZOOM GUIDE</div>
    {'🌍 Global\n🌏 Continent\n🗺 Country\n📍 Region\n🏙 City'.split('\n').map(l => (
      <div key={l}>{l}</div>
    ))}
    <div style={{ marginTop: 6, color: '#334155' }}>Drag · Scroll · Click</div>
  </div>
);

const CompassRose: React.FC = () => (
  <svg width={48} height={48} viewBox="-24 -24 48 48">
    <circle r={20} fill="rgba(5,8,16,0.6)" stroke="rgba(56,189,248,0.2)" strokeWidth={1} />
    {[['N','#38bdf8',0],['E','#64748b',90],['S','#64748b',180],['W','#64748b',270]].map(([d, c, a]) => (
      <text key={d as string} x={0} y={0} fill={c as string} fontSize={8} fontWeight={700}
        textAnchor="middle" dominantBaseline="middle" fontFamily="monospace"
        transform={`rotate(${a}) translate(0,-14) rotate(-${a})`}>{d as string}</text>
    ))}
    <circle r={2} fill="#38bdf8" />
  </svg>
);

/* ─── Helper: hex → r,g,b string ─────────────────────────────────────────── */
function hexRgb(hex: string): string {
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '56,189,248';
}

/* ─── Helper: rough continent lookup ──────────────────────────────────────── */
function getContinent(country: string): string {
  const map: Record<string, string> = {
    'India': 'Asia', 'China': 'Asia', 'Japan': 'Asia', 'Pakistan': 'Asia',
    'Bangladesh': 'Asia', 'Indonesia': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia',
    'Philippines': 'Asia', 'Iran': 'Asia', 'Saudi Arabia': 'Asia',
    'United States': 'North America', 'United States of America': 'North America',
    'Canada': 'North America', 'Mexico': 'North America',
    'Brazil': 'South America', 'Argentina': 'South America',
    'Germany': 'Europe', 'France': 'Europe', 'United Kingdom': 'Europe', 'Russia': 'Europe',
    'Australia': 'Oceania',
    'Nigeria': 'Africa', 'South Africa': 'Africa', 'Egypt': 'Africa', 'Kenya': 'Africa',
  };
  return map[country] ?? 'Global';
}

export default ExecutiveDashboard;
