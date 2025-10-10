import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './routes/Homepage';
import AppRoute from './routes/AppRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/app" element={<AppRoute />} />
      </Routes>
    </Router>
  );
}

export default App;
