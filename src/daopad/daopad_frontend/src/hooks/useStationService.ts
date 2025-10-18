import { useMemo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { createStationService, OrbitStationError } from '../services/orbit/stationService';

/**
 * Hook to create and manage an OrbitStationService instance
 */
export function useStationService(stationId, identity) {
  const [serviceState, setServiceState] = useState({
    service: null,
    health: null,
    loading: false,
    error: null,
  });

  const service = useMemo(() => {
    if (!stationId || !identity) return null;

    try {
      return createStationService({
        stationId,
        identity,
        host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : undefined,
      });
    } catch (error) {
      console.error('Failed to create station service:', error);
      return null;
    }
  }, [stationId, identity]);

  // Perform health check when service is created
  useEffect(() => {
    if (!service) {
      setServiceState({
        service: null,
        health: null,
        loading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;
    setServiceState(prev => ({ ...prev, loading: true, error: null }));

    service.healthCheck()
      .then(health => {
        if (!cancelled) {
          setServiceState({
            service,
            health,
            loading: false,
            error: health.healthy ? null : new Error(health.error),
          });
        }
      })
      .catch(error => {
        if (!cancelled) {
          setServiceState({
            service,
            health: null,
            loading: false,
            error: error instanceof OrbitStationError ? error : new Error(error.message),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [service]);

  return serviceState;
}

/**
 * Hook to get station service for the currently active token
 */
export function useActiveStationService(tokenId, identity) {
  const stationInfo = useSelector(state =>
    state.dao.stationIndex[tokenId] || null
  );

  const stationId = stationInfo?.stationId;
  const hasStation = Boolean(stationId) && stationInfo?.status === 'linked';

  const serviceState = useStationService(hasStation ? stationId : null, identity);

  return {
    ...serviceState,
    hasStation,
    stationId,
    stationStatus: stationInfo?.status || 'unknown',
  };
}

export default useStationService;