import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectStationByToken } from '../features/dao/daoSlice';

/**
 * Derives the active Orbit station metadata for a token.
 * Returns a stable object with inferred status information so Orbit
 * feature modules can render consistent fallback states.
 */
export function useActiveStation(tokenId) {
  const stationEntry = useSelector((state) => selectStationByToken(state, tokenId));

  return useMemo(() => {
    if (!tokenId) {
      return {
        tokenId: null,
        stationId: null,
        status: 'no-token',
        hasStation: false,
        source: null,
        updatedAt: null,
        error: null,
      };
    }

    if (!stationEntry) {
      return {
        tokenId,
        stationId: null,
        status: 'unknown',
        hasStation: false,
        source: null,
        updatedAt: null,
        error: null,
      };
    }

    const derivedStatus = stationEntry.status
      ?? (stationEntry.stationId ? 'linked' : 'missing');

    return {
      tokenId,
      stationId: stationEntry.stationId ?? null,
      status: derivedStatus,
      hasStation: Boolean(stationEntry.stationId),
      source: stationEntry.source ?? null,
      updatedAt: stationEntry.updatedAt ?? null,
      error: stationEntry.error ?? null,
    };
  }, [stationEntry, tokenId]);
}

export default useActiveStation;
