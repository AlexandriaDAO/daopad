import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';
import { toSerializable } from '../utils/serialization';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // Data fresh for 30s (was 5s)
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error?.message?.includes('Unauthorized')) {
          return false;
        }
        return failureCount < 2;  // Only retry once (was 2)
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

export function QueryClientProvider({ children }) {
  const client = useMemo(() => queryClient, []);
  return <TanStackQueryClientProvider client={client}>{children}</TanStackQueryClientProvider>;
}
