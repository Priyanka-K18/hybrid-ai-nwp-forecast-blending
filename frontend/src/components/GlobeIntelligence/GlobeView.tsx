/**
 * GlobeView.tsx
 * Interactive 3D Earth powered by globe.gl (Three.js under the hood).
 * Handles: rotation, zoom, country hover/click, location fly-to, weather overlays.
 */
import React, {
  useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle,
} from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface GlobeLocation {
  lat: number;
  lng: number;
  name: string;
  country?: string;
  admin1?: string;
  altitude?: number;
}

export interface GlobeWeatherPoint {
  lat: number;
  lng: number;
  value: number;   // e.g. mm/h, °C, km/h
  type: 'precipitation' | 'temperature' | 'wind' | 'extreme';
  label?: string;
}

export interface GlobeHandle {
  flyTo: (loc: GlobeLocation) => void;
  reset: () => void;
  addWeatherPoints: (pts: GlobeWeatherPoint[]) => void;
}

interface GlobeViewProps {
  onCountryHover?: (country: string | null, lat: number, lng: number) => void;
  onCountryClick?: (country: string, lat: number, lng: number) => void;
  weatherPoints?: GlobeWeatherPoint[];
  activeLocation?: GlobeLocation | null;
  style?: React.CSSProperties;
}

/* ─── Colour helpers ─────────────────────────────────────────────────────── */
const pointColour = (type: GlobeWeatherPoint['type']) => {
  switch (type) {
    case 'precipitation': return 'rgba(56,189,248,0.85)';
    case 'temperature':   return 'rgba(251,146,60,0.85)';
    case 'wind':          return 'rgba(167,139,250,0.85)';
    case 'extreme':       return 'rgba(248,113,113,0.95)';
    default:              return 'rgba(255,255,255,0.5)';
  }
};

/* ─── GlobeView Component ────────────────────────────────────────────────── */
const GlobeView = forwardRef<GlobeHandle, GlobeViewProps>(
  ({ onCountryHover, onCountryClick, weatherPoints = [], activeLocation, style }, ref) => {
    const mountRef  = useRef<HTMLDivElement>(null);
    const globeRef  = useRef<any>(null);
    const loadedRef = useRef(false);

    /* init globe once */
    useEffect(() => {
      if (loadedRef.current || !mountRef.current) return;
      loadedRef.current = true;

      /* dynamic import so webpack can tree-shake if unused */
      import('globe.gl').then(({ default: Globe }) => {
        const el = mountRef.current;
        if (!el) return;

        const w = el.clientWidth  || 800;
        const h = el.clientHeight || 600;

        const globe = Globe()(el)
          .width(w)
          .height(h)
          /* ── Earth appearance ── */
          .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
          .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
          .atmosphereColor('rgba(56,189,248,0.25)')
          .atmosphereAltitude(0.22)
          .backgroundColor('#00000000')
          /* ── Polygons (countries) ── */
          .polygonsData([])
          .polygonCapColor((feat: any) => {
            const selected = (globe as any).__selectedCountry;
            return feat.properties?.ADMIN === selected
              ? 'rgba(56,189,248,0.45)'
              : 'rgba(255,255,255,0.04)';
          })
          .polygonSideColor(() => 'rgba(56,189,248,0.08)')
          .polygonStrokeColor(() => 'rgba(56,189,248,0.35)')
          .polygonAltitude((feat: any) => {
            const selected = (globe as any).__selectedCountry;
            return feat.properties?.ADMIN === selected ? 0.018 : 0.006;
          })
          .onPolygonHover((feat: any) => {
            const name = feat?.properties?.ADMIN ?? null;
            // Get lat/lng from centroid if available
            const lat = feat?.properties?.LAT ?? 0;
            const lng = feat?.properties?.LON ?? 0;
            (globe as any).__hoveredCountry = name;
            globe.polygonCapColor((f: any) => {
              const sel = (globe as any).__selectedCountry;
              const hov = (globe as any).__hoveredCountry;
              const admin = f.properties?.ADMIN;
              if (admin === sel) return 'rgba(56,189,248,0.50)';
              if (admin === hov) return 'rgba(56,189,248,0.22)';
              return 'rgba(255,255,255,0.04)';
            });
            onCountryHover?.(name, lat, lng);
          })
          .onPolygonClick((feat: any, _evt: any, { lat, lng }: any) => {
            const name = feat?.properties?.ADMIN ?? '';
            if (!name) return;
            (globe as any).__selectedCountry = name;
            globe.polygonCapColor((f: any) => {
              const sel = (globe as any).__selectedCountry;
              const hov = (globe as any).__hoveredCountry;
              const admin = f.properties?.ADMIN;
              if (admin === sel) return 'rgba(56,189,248,0.50)';
              if (admin === hov) return 'rgba(56,189,248,0.22)';
              return 'rgba(255,255,255,0.04)';
            });
            globe.polygonAltitude((f: any) => {
              return f.properties?.ADMIN === name ? 0.018 : 0.006;
            });
            // Fly camera to country
            globe.pointOfView({ lat, lng, altitude: 1.8 }, 1200);
            onCountryClick?.(name, lat, lng);
          })
          /* ── Points (weather) ── */
          .pointsData([])
          .pointColor((p: any) => pointColour(p.type))
          .pointAltitude((p: any) => p.type === 'extreme' ? 0.08 : Math.min(0.12, 0.02 + (p.value || 0) * 0.002))
          .pointRadius((p: any) => p.type === 'extreme' ? 0.65 : Math.min(0.65, 0.25 + (p.value || 0) * 0.005))
          .pointLabel((p: any) => `<div style="background:rgba(5,8,16,0.92);padding:6px 10px;border-radius:6px;border:1px solid rgba(56,189,248,0.4);font-family:sans-serif;font-size:11px;color:#f8fafc;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.5);">${p.label || p.type}</div>`)
          .pointsMerge(false)
          /* ── Pulsating Rings for Extreme alerts ── */
          .ringsData([])
          .ringColor(() => (t: number) => `rgba(248,113,113,${Math.max(0, 0.85 * (1 - t))})`)
          .ringMaxRadius(4.2)
          .ringPropagationSpeed(2.2)
          .ringRepeatPeriod(1100)
          /* ── Labels for active location ── */
          .labelsData([])
          .labelText((l: any) => l.name)
          .labelSize(1.3)
          .labelDotRadius(0.4)
          .labelColor(() => 'rgba(56,189,248,1)')
          .labelAltitude(0.025);

        /* auto-rotate when idle */
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.35;
        globe.controls().enableDamping = true;
        globe.controls().dampingFactor = 0.06;
        globe.controls().minDistance  = 150;
        globe.controls().maxDistance  = 600;

        /* stop rotate on user interaction */
        globe.controls().addEventListener('start', () => {
          globe.controls().autoRotate = false;
        });
        /* resume after 4s idle */
        let idleTimer: ReturnType<typeof setTimeout>;
        globe.controls().addEventListener('end', () => {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            globe.controls().autoRotate = true;
          }, 4000);
        });

        /* initial camera */
        globe.pointOfView({ lat: 20, lng: 78, altitude: 2.5 }, 0);

        /* load country polygons */
        fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
          .catch(() => fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json'))
          .then(r => r.json())
          .then(data => {
            // Support both geojson formats
            const features = data.features ?? data.objects?.countries?.geometries ?? [];
            globe.polygonsData(features);
          })
          .catch(() => {
            /* silently degrade — globe still works without polygon borders */
          });

        globeRef.current = globe;

        /* resize observer */
        const ro = new ResizeObserver(() => {
          const ew = el.clientWidth;
          const eh = el.clientHeight;
          if (ew && eh) { globe.width(ew).height(eh); }
        });
        ro.observe(el);
        return () => { ro.disconnect(); };
      });
    }, []);

    /* update weather points & rings */
    useEffect(() => {
      if (!globeRef.current) return;
      globeRef.current.pointsData(weatherPoints);
      const extremePoints = weatherPoints.filter(p => p.type === 'extreme');
      globeRef.current.ringsData(extremePoints);
    }, [weatherPoints]);

    /* update label for active location */
    useEffect(() => {
      if (!globeRef.current) return;
      const labels = activeLocation ? [{ name: activeLocation.name, lat: activeLocation.lat, lng: activeLocation.lng }] : [];
      globeRef.current.labelsData(labels);
    }, [activeLocation]);

    /* imperative API */
    useImperativeHandle(ref, () => ({
      flyTo(loc: GlobeLocation) {
        if (!globeRef.current) return;
        globeRef.current.controls().autoRotate = false;
        globeRef.current.pointOfView(
          { lat: loc.lat, lng: loc.lng, altitude: loc.altitude ?? 1.5 },
          1400,
        );
      },
      reset() {
        if (!globeRef.current) return;
        globeRef.current.pointOfView({ lat: 20, lng: 78, altitude: 2.5 }, 1200);
        globeRef.current.controls().autoRotate = true;
        (globeRef.current as any).__selectedCountry = null;
      },
      addWeatherPoints(pts: GlobeWeatherPoint[]) {
        if (!globeRef.current) return;
        globeRef.current.pointsData(pts);
      },
    }), []);

    return (
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
          cursor: 'grab',
          ...style,
        }}
      />
    );
  }
);

GlobeView.displayName = 'GlobeView';
export default GlobeView;
