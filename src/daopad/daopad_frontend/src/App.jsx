import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Homepage from './routes/Homepage';
import AppRoute from './routes/AppRoute';
import { toSerializable } from './utils/serialization';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error?.message?.includes('Unauthorized')) {
          return false;
        }
        return failureCount < 2;
      },
      select: (data) => toSerializable(data),
    },
    mutations: {
      retry: false,
      onError: (error) => {
        console.error('Mutation error', error);
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
