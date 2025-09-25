import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from './providers/QueryClientProvider.jsx';
import Homepage from './routes/Homepage';
import AppRoute from './routes/AppRoute';

function App() {
  return (
    <QueryClientProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/app" element={<AppRoute />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
