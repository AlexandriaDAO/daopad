import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';
import { toSerializable } from '../utils/serialization';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
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

export function QueryClientProvider({ children }) {
  const client = useMemo(() => queryClient, []);
  return <TanStackQueryClientProvider client={client}>{children}</TanStackQueryClientProvider>;
}
