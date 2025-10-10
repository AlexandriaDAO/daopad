import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FallbackLoader } from './components/ui/fallback-loader';

// Code splitting: Lazy load routes for better initial bundle size
const Homepage = lazy(() => import('./routes/Homepage'));
const AppRoute = lazy(() => import('./routes/AppRoute'));

function App() {
  return (
    <Router>
      <Suspense fallback={<FallbackLoader />}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/app" element={<AppRoute />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
