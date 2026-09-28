import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    path: '/', label: 'Executive Dashboard', badge: 'LIVE',
    color: '#38bdf8',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    path: '/live-weather', label: 'Live Weather', badge: 'LIVE',
    color: '#22d3ee',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
      </svg>
    ),
  },
  {
    path: '/explorer', label: 'Forecast Explorer',
    color: '#06b6d4',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    ),
  },
  {
    path: '/blending', label: 'Adaptive Blending', highlight: true,
    color: '#818cf8',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    path: '/skills', label: 'Model Skill Lab',
    color: '#34d399',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    path: '/weight-maps', label: 'Weight Maps',
    color: '#f59e0b',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
  },
  {
    path: '/extremes', label: 'Extreme Weather',
    color: '#fb7185',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    path: '/verification', label: 'Verification Lab',
    color: '#34d399',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    path: '/data-sources', label: 'Data Sources',
    color: '#a78bfa',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
  {
    path: '/operational', label: 'Operational Runs',
    color: '#06b6d4',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
  },
  {
    path: '/settings', label: 'Settings / Health',
    color: '#94a3b8',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? 56 : 228,
      minHeight: 'calc(100vh - 56px)',
      background: 'rgba(7,11,20,0.9)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(56,189,248,0.1)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '12px 8px',
      flexShrink: 0,
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          position: 'absolute', top: 14, right: -10,
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.35)',
          color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 20, transition: 'all 0.2s',
          fontSize: 10,
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      <div>
        {!collapsed && (
          <div style={{
            padding: '4px 10px 10px',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(148,163,184,0.45)',
            borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 8,
          }}>
            Forecasting Suite
          </div>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
                gap: 10, padding: collapsed ? '10px 0' : '9px 10px',
                borderRadius: 10, textDecoration: 'none', fontSize: 11, fontWeight: 600,
                transition: 'all 0.18s ease',
                color: isActive ? item.color : 'rgba(148,163,184,0.7)',
                background: isActive ? `${item.color}12` : 'transparent',
                border: isActive ? `1px solid ${item.color}30` : '1px solid transparent',
                boxShadow: isActive ? `0 0 12px ${item.color}15` : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{
                      color: isActive ? item.color : 'rgba(148,163,184,0.5)',
                      flexShrink: 0, transition: 'color 0.2s',
                    }}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {!collapsed && item.badge && (
                    <span style={{
                      fontSize: 8, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                      color: item.color, background: `${item.color}15`,
                      border: `1px solid ${item.color}40`, borderRadius: 4,
                      padding: '1px 5px', flexShrink: 0,
                      animation: 'breathe 2s ease-in-out infinite',
                    }}>
                      {item.badge}
                    </span>
                  )}
                  {!collapsed && item.highlight && !isActive && (
                    <span style={{
                      width: 4, height: 4, borderRadius: '50%', background: item.color,
                      flexShrink: 0, boxShadow: `0 0 6px ${item.color}`,
                      animation: 'breathe 2.5s ease-in-out infinite',
                    }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* System info footer */}
      {!collapsed && (
        <div style={{
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56,189,248,0.1)',
          borderRadius: 10, padding: '10px 12px',
        }}>
          <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
            Core Status
          </div>
          {[
            ['Models', '3 + 1 Blend', '#38bdf8'],
            ['Optimization', 'Softmax', '#34d399'],
            ['Pipeline', 'Auto-verify ON', '#a78bfa'],
          ].map(([k, v, c]) => (
            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
              <span style={{ color: 'rgba(148,163,184,0.5)' }}>{k}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: c as string, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};
