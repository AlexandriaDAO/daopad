import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../providers/AuthProvider/IIProvider.jsx';
import { createStationClient } from './stationClient';
import { DAOPadBackendService } from '../daopadBackend';
import { toast } from '../../components/ui/toaster';
import { toSerializable } from '../../utils/serialization';

const DEFAULT_STATION_ID = import.meta.env.VITE_DEFAULT_STATION_ID;

function useStationClient(stationId = DEFAULT_STATION_ID) {
  const { identity } = useAuth();
  return useMemo(() => {
    if (!stationId || !identity) return null;
    return createStationClient({ stationId, identity });
  }, [stationId, identity]);
}

export function useListUsersQuery(options = {}) {
  const client = useStationClient(options.stationId);
  return useQuery({
    queryKey: ['station', options.stationId ?? DEFAULT_STATION_ID, 'users', options.paginate],
    enabled: Boolean(client),
    queryFn: async () => {
      const result = await client.listUsers({ paginate: options.paginate });
      return toSerializable(result);
    },
  });
}

export function useSystemInfoQuery(options = {}) {
  const client = useStationClient(options.stationId);
  return useQuery({
    queryKey: ['station', options.stationId ?? DEFAULT_STATION_ID, 'system-info'],
    enabled: Boolean(client),
    queryFn: async () => {
      const result = await client.getSystemInfo();
      return toSerializable(result);
    },
  });
}

export function useBackendTestMutation() {
  const backend = useMemo(() => new DAOPadBackendService(), []);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const result = await backend.testBackendIntegration(payload);
      if (!result.success) {
        throw new Error(result.error ?? 'Backend test failed');
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.data.message ?? 'Backend call succeeded');
      queryClient.invalidateQueries({ queryKey: ['station'] });
    },
    onError: (error) => {
      toast.error(error.message ?? 'Backend call failed');
    },
  });
}
