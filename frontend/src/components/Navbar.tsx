import React, { useState, useEffect } from 'react';
import { Region } from '../types';

interface NavbarProps {
  regions: Region[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ regions, selectedRegionId, onSelectRegion }) => {
  const [time, setTime] = useState('');
  const [blip, setBlip] = useState(true);
  const [cycle, setCycle] = useState('00Z');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const utc = now.toUTCString().replace('GMT', '');
      setTime(utc.slice(5, 25));
      setBlip(b => !b);
      // Fake synoptic cycle label
      const h = now.getUTCHours();
      setCycle(h < 6 ? '00Z' : h < 12 ? '06Z' : h < 18 ? '12Z' : '18Z');
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(7,11,20,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(56,189,248,0.12)',
      padding: '0 24px',
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 2px 30px rgba(0,0,0,0.5)',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Logo icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(56,189,248,0.25) 0%, rgba(99,102,241,0.25) 100%)',
          border: '1px solid rgba(56,189,248,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}>
          {/* Radar sweep animation */}
          <div style={{
            position: 'absolute', inset: 2, borderRadius: 7, overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '100%', height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.8))',
              transformOrigin: 'left center',
              animation: 'radarSweep 3s linear infinite',
            }} />
          </div>
          <svg width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'relative', zIndex: 1 }}>
            <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" strokeLinecap="round"/>
            <line x1="8" y1="19" x2="8" y2="21" strokeLinecap="round"/>
            <line x1="8" y1="13" x2="8" y2="15" strokeLinecap="round"/>
            <line x1="12" y1="15" x2="12" y2="17" strokeLinecap="round"/>
            <line x1="16" y1="13" x2="16" y2="15" strokeLinecap="round"/>
          </svg>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{
              fontSize: 14, fontWeight: 800, color: 'white',
              letterSpacing: '-0.01em', margin: 0,
              background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              HYBRID AI–NWP BLENDING SYSTEM
            </h1>
            <span style={{
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              color: '#38bdf8', background: 'rgba(56,189,248,0.1)',
              border: '1px solid rgba(56,189,248,0.3)', borderRadius: 4, padding: '2px 6px',
            }}>v1.0-RC</span>
            <span style={{
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              color: '#fbbf24', background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, padding: '2px 6px',
            }}>DEMO DATA</span>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', margin: 0, letterSpacing: '0.01em' }}>
            Physical NWP · 51-Member Ensemble · Neural Weather AI · Karnataka Region
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Region */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(56,189,248,0.2)',
          borderRadius: 8, padding: '5px 10px',
        }}>
          <svg width="12" height="12" fill="none" stroke="#38bdf8" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <select
            value={selectedRegionId}
            onChange={e => onSelectRegion(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#38bdf8', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {regions.map(r => (
              <option key={r.id} value={r.id} style={{ background: '#0a0e17' }}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Synoptic cycle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8, padding: '5px 10px',
        }}>
          <svg width="12" height="12" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#818cf8', fontWeight: 700 }}>
            Cycle {cycle}
          </span>
        </div>

        {/* UTC Clock */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8, padding: '5px 10px',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: '#34d399',
            display: 'inline-block',
            animation: 'breathe 1s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(148,163,184,0.8)' }}>
            {time || '...'}
          </span>
          <span style={{
            fontSize: 9, color: '#38bdf8', fontWeight: 700,
            opacity: blip ? 1 : 0.25, transition: 'opacity 0.15s',
          }}>UTC</span>
        </div>

        {/* Model pills */}
        <div style={{ display: 'none' }} className="lg:flex" />
        <div style={{ display: 'flex', gap: 6 }}>
          {[['NWP', '#f59e0b'], ['ENS', '#06b6d4'], ['AI', '#a78bfa']].map(([l, c]) => (
            <span key={l} style={{
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              color: c, background: `${c}12`, border: `1px solid ${c}30`,
              borderRadius: 4, padding: '2px 6px',
            }}>{l}</span>
          ))}
        </div>

        {/* Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 20, padding: '4px 10px',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'breathe 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 9, color: '#34d399', fontWeight: 700, letterSpacing: '0.1em' }}>ONLINE</span>
        </div>
      </div>

      {/* Inline CSS for radar sweep */}
      <style>{`
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </header>
  );
};
