import React, { useState, useEffect } from 'react';
import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { getTokenService } from '../services/backend';
import DaoLayout from '../components/dao/DaoLayout';
import { FallbackLoader } from '../components/ui/fallback-loader';
import { useVoting } from '../hooks/useVoting';

export default function DaoRoute() {
  const { tokenId } = useParams();
  const { identity, isAuthenticated } = useSelector((state: any) => state.auth);
  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orbitStation, setOrbitStation] = useState<any>(null);
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch voting power using existing hook
  const { userVotingPower, loadingVP, fetchVotingPower } = useVoting(tokenId);

  useEffect(() => {
    async function loadToken() {
      if (!tokenId) {
        setError('No token ID provided');
        setLoading(false);
        return;
      }

      try {
        const tokenService = getTokenService(identity);
        let principal: Principal;

        try {
          principal = Principal.fromText(tokenId);
        } catch (e) {
          console.error('[DaoRoute] Invalid principal:', tokenId, e);
          setError('Invalid token ID format');
          setLoading(false);
          return;
        }

        // PARALLEL DATA FETCHING (critical performance optimization)
        // Fetch all data simultaneously instead of sequentially
        const [stationResult, metadataResult, overviewResult] = await Promise.all([
          // 1. Station info (works for both authenticated and anonymous)
          tokenService.getStationForToken(principal).catch(e => {
            console.warn('[DaoRoute] Station fetch failed:', e);
            return { success: false, error: e };
          }),

          // 2. Token metadata (only if authenticated)
          isAuthenticated && identity
            ? tokenService.getTokenMetadata(principal).catch(e => {
                console.warn('[DaoRoute] Metadata fetch failed:', e);
                return { success: false, error: e };
              })
            : Promise.resolve({ success: false }),

          // 3. Overview stats (NEW - works for anonymous)
          tokenService.getDaoOverview(principal).catch(e => {
            console.warn('[DaoRoute] Overview fetch failed:', e);
            return { success: false, error: e };
          }),
        ]);

        console.log('[DaoRoute] Parallel fetch results:', {
          station: stationResult,
          metadata: metadataResult,
          overview: overviewResult
        });

        // Process station info
        if (stationResult.success && stationResult.data) {
          const stationId = typeof stationResult.data === 'string'
            ? stationResult.data
            : stationResult.data.toString();

          setOrbitStation({
            station_id: stationId,
            name: `${tokenId} Treasury`
          });
        }

        // Process overview stats
        if (overviewResult.success && overviewResult.data) {
          setOverviewStats(overviewResult.data);
        }

        // Process token metadata
        if (metadataResult.success && metadataResult.data) {
          // Use real metadata (no fallback - shows actual token info)
          setToken({
            canister_id: tokenId,
            symbol: metadataResult.data.symbol,
            name: metadataResult.data.name
          });
        } else {
          // Fallback for anonymous or failed metadata (clearer format)
          const shortId = tokenId.slice(0, 8);
          setToken({
            canister_id: tokenId,
            symbol: shortId.toUpperCase(),
            name: `${shortId.toUpperCase()} DAO`
          });
        }

        setLoading(false);
      } catch (e) {
        console.error('[DaoRoute] Error loading token:', e);
        setError('Failed to load token data');
        setLoading(false);
      }
    }

    loadToken();
  }, [tokenId, identity, isAuthenticated]);

  if (loading) {
    return <FallbackLoader />;
  }

  if (error || !token) {
    return <Navigate to="/app" replace />;
  }

  // Render layout with token data (shared across all tab routes)
  return (
    <DaoLayout
      token={token}
      orbitStation={orbitStation}
      votingPower={userVotingPower}
      loadingVotingPower={loadingVP}
      refreshVotingPower={fetchVotingPower}
    >
      <Outlet context={{
        token,
        orbitStation,
        overviewStats,
        identity,
        isAuthenticated,
        votingPower: userVotingPower,
        loadingVotingPower: loadingVP,
        refreshVotingPower: fetchVotingPower
      }} />
    </DaoLayout>
  );
}
