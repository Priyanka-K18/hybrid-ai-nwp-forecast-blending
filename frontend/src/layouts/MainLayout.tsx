import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { fetchRegions } from '../services/api';
import { Region } from '../types';

import { ErrorBoundary } from '../components/ErrorBoundary';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  const [regions, setRegions] = useState<Region[]>([
    { id: 'karnataka',  name: 'Karnataka',       lat: 15.3173, lon: 75.7139, zone: 'Western Peninsular',    default_regime: 'Convective' },
    { id: 'kerala',     name: 'Kerala',           lat: 10.8505, lon: 76.2711, zone: 'South Coastal',         default_regime: 'Heavy Rain' },
    { id: 'maharashtra',name: 'Maharashtra',      lat: 19.7515, lon: 75.7139, zone: 'Western Deccan',        default_regime: 'Convective' },
    { id: 'tamil_nadu', name: 'Tamil Nadu',       lat: 11.1271, lon: 78.6569, zone: 'Coromandel Coastal',    default_regime: 'Stable' },
    { id: 'rajasthan',  name: 'Rajasthan',        lat: 27.0238, lon: 74.2179, zone: 'North-West Arid',       default_regime: 'Heat Wave' },
    { id: 'delhi',      name: 'Delhi (NCR)',      lat: 28.7041, lon: 77.1025, zone: 'Northern Plains',       default_regime: 'Heat Wave' },
    { id: 'assam',      name: 'Assam',            lat: 26.2006, lon: 92.9376, zone: 'North-East Humid',      default_regime: 'Heavy Rain' },
    { id: 'odisha',     name: 'Odisha',           lat: 20.9517, lon: 85.9836, zone: 'Eastern Coastal',       default_regime: 'Cyclonic' },
  ]);
  const [selectedRegionId, setSelectedRegionId] = useState('karnataka');

  useEffect(() => {
    fetchRegions()
      .then(data => { if (data && data.length > 0) setRegions(data); })
      .catch(err => console.warn('Using default regions:', err));
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070b14' }}>
      <Navbar
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelectRegion={setSelectedRegionId}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{
          flex: 1,
          overflowY: isDashboard ? 'hidden' : 'auto',
          overflowX: 'hidden',
          padding: isDashboard ? 0 : '20px 24px',
          background: 'transparent',
          position: 'relative',
        }}>
          <ErrorBoundary fallbackTitle="Page Load Error">
            <Outlet context={{ selectedRegionId, setSelectedRegionId, regions }} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
