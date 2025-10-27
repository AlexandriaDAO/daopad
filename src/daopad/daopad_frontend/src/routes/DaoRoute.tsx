import React, { useState, useEffect } from 'react';
import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { getTokenService } from '../services/backend';
import DaoLayout from '../components/dao/DaoLayout';
import { FallbackLoader } from '../components/ui/fallback-loader';
import { useVoting } from '../hooks/useVoting';

export default function DaoRoute() {
  const { stationId } = useParams();  // Changed from tokenId to stationId
  const { identity, isAuthenticated } = useSelector((state: any) => state.auth);
  const [token, setToken] = useState<any>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);  // Store token ID internally
  const [loading, setLoading] = useState(true);
  const [orbitStation, setOrbitStation] = useState<any>(null);
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch voting power using existing hook (once we have token ID)
  const { userVotingPower, loadingVP, fetchVotingPower } = useVoting(tokenId);

  useEffect(() => {
    async function loadStation() {
      if (!stationId) {
        setError('No station ID provided');
        setLoading(false);
        return;
      }

      try {
        const tokenService = getTokenService(identity);
        let stationPrincipal: Principal;

        try {
          stationPrincipal = Principal.fromText(stationId);
        } catch (e) {
          console.error('[DaoRoute] Invalid station principal:', stationId, e);
          setError('Invalid station ID format');
          setLoading(false);
          return;
        }

        // 1. First get token ID from station ID (reverse lookup)
        const tokenResult = await tokenService.getTokenForStation(stationPrincipal).catch(e => {
          console.warn('[DaoRoute] Token lookup failed:', e);
          return { success: false, error: e };
        });

        if (!tokenResult.success || !tokenResult.data) {
          console.error('[DaoRoute] No token found for station:', stationId);
          setError('Station not linked to any token');
          setLoading(false);
          return;
        }

        const resolvedTokenId = tokenResult.data.toString();
        setTokenId(resolvedTokenId);
        const tokenPrincipal = Principal.fromText(resolvedTokenId);

        // 2. PARALLEL DATA FETCHING (critical performance optimization)
        // Fetch all data simultaneously now that we have token ID
        const [metadataResult, overviewResult] = await Promise.all([
          // Token metadata (only if authenticated)
          isAuthenticated && identity
            ? tokenService.getTokenMetadata(tokenPrincipal).catch(e => {
                console.warn('[DaoRoute] Metadata fetch failed:', e);
                return { success: false, error: e };
              })
            : Promise.resolve({ success: false }),

          // Overview stats (works for anonymous)
          tokenService.getDaoOverview(tokenPrincipal).catch(e => {
            console.warn('[DaoRoute] Overview fetch failed:', e);
            return { success: false, error: e };
          }),
        ]);

        console.log('[DaoRoute] Parallel fetch results:', {
          token: resolvedTokenId,
          metadata: metadataResult,
          overview: overviewResult
        });

        // Process station info (we already have it)
        setOrbitStation({
          station_id: stationId,
          name: `${stationId.slice(0, 8)} Treasury`
        });

        // Process overview stats
        if (overviewResult.success && overviewResult.data) {
          setOverviewStats(overviewResult.data);
        }

        // Process token metadata
        if (metadataResult.success && metadataResult.data) {
          // Use real metadata with defensive checks for malformed data
          const symbol = metadataResult.data.symbol?.trim() || resolvedTokenId.slice(0, 8).toUpperCase();
          const name = metadataResult.data.name?.trim() || `${symbol} Treasury`;

          setToken({
            canister_id: resolvedTokenId,
            symbol,
            name: name.slice(0, 100) // Limit to 100 chars to prevent UI issues
          });
        } else {
          // Fallback for anonymous or failed metadata (clearer format)
          const shortId = resolvedTokenId.slice(0, 8);
          setToken({
            canister_id: resolvedTokenId,
            symbol: shortId.toUpperCase(),
            name: `${shortId.toUpperCase()} Treasury`
          });
        }

        setLoading(false);
      } catch (e) {
        console.error('[DaoRoute] Error loading station:', e);
        setError('Failed to load station data');
        setLoading(false);
      }
    }

    loadStation();
  }, [stationId, identity, isAuthenticated]);

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
