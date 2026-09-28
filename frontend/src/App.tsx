import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { LiveWeatherForecast } from './pages/LiveWeatherForecast';
import { ForecastExplorer } from './pages/ForecastExplorer';
import { AdaptiveBlendingCenter } from './pages/AdaptiveBlendingCenter';
import { ModelSkillLab } from './pages/ModelSkillLab';
import { ModelWeightMaps } from './pages/ModelWeightMaps';
import { ExtremeWeatherCenter } from './pages/ExtremeWeatherCenter';
import { VerificationDashboard } from './pages/VerificationDashboard';
import { DataSources } from './pages/DataSources';
import { OperationalRuns } from './pages/OperationalRuns';
import { SettingsHealth } from './pages/SettingsHealth';

import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<ExecutiveDashboard />} />
          <Route path="live-weather" element={<LiveWeatherForecast />} />
          <Route path="explorer" element={<ForecastExplorer />} />
          <Route path="blending" element={<AdaptiveBlendingCenter />} />
          <Route path="skills" element={<ModelSkillLab />} />
          <Route path="weight-maps" element={<ModelWeightMaps />} />
          <Route path="extremes" element={<ExtremeWeatherCenter />} />
          <Route path="verification" element={<VerificationDashboard />} />
          <Route path="data-sources" element={<DataSources />} />
          <Route path="operational" element={<OperationalRuns />} />
          <Route path="settings" element={<SettingsHealth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
);
};

export default App;
