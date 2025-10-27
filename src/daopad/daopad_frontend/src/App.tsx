import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FallbackLoader } from './components/ui/fallback-loader';
import LazyLoadErrorBoundary from './components/errors/LazyLoadErrorBoundary';

// Code splitting: Lazy load routes for better initial bundle size
const Homepage = lazy(() => import('./routes/Homepage'));
const AppRoute = lazy(() => import('./routes/AppRoute'));
const OperatingAgreement = lazy(() => import('./routes/OperatingAgreement'));

// New DAO routes
const DaoRoute = lazy(() => import('./routes/DaoRoute'));
const DaoOverview = lazy(() => import('./routes/dao/DaoOverview'));
const DaoAgreement = lazy(() => import('./routes/dao/DaoAgreement'));
const DaoTreasury = lazy(() => import('./routes/dao/DaoTreasury'));
const DaoActivity = lazy(() => import('./routes/dao/DaoActivity'));
const DaoCanisters = lazy(() => import('./routes/dao/DaoCanisters'));
const DaoSettings = lazy(() => import('./routes/dao/DaoSettings'));

function App() {
  return (
    <Router>
      <LazyLoadErrorBoundary>
        <Suspense fallback={<FallbackLoader />}>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/app" element={<AppRoute />} />
            <Route path="/agreement/:stationId" element={<OperatingAgreement />} />

            {/* Station routes - using station ID as primary identifier */}
            <Route path="/:stationId" element={<DaoRoute />}>
              <Route index element={<DaoOverview />} />
              <Route path="agreement" element={<DaoAgreement />} />
              <Route path="treasury" element={<DaoTreasury />} />
              <Route path="activity" element={<DaoActivity />} />
              <Route path="canisters" element={<DaoCanisters />} />
              <Route path="settings" element={<DaoSettings />} />
            </Route>
          </Routes>
        </Suspense>
      </LazyLoadErrorBoundary>
    </Router>
  );
}

export default App;
