import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FallbackLoader } from './components/ui/fallback-loader';
import LazyLoadErrorBoundary from './components/errors/LazyLoadErrorBoundary';

// Code splitting: Lazy load routes for better initial bundle size
const Homepage = lazy(() => import('./routes/Homepage'));
const AppRoute = lazy(() => import('./routes/AppRoute'));

function App() {
  return (
    <Router>
      <LazyLoadErrorBoundary>
        <Suspense fallback={<FallbackLoader />}>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/app" element={<AppRoute />} />
          </Routes>
        </Suspense>
      </LazyLoadErrorBoundary>
    </Router>
  );
}

export default App;
