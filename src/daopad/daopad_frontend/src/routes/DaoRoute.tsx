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

        // 1. Try reverse lookup (station ID -> token ID)
        const tokenResult = await tokenService.getTokenForStation(stationPrincipal).catch(e => {
          console.warn('[DaoRoute] Token lookup failed:', e);
          return { success: false, error: e };
        });

        // If reverse lookup fails, assume stationId is actually a tokenId (no station linked yet)
        if (!tokenResult.success || !tokenResult.data) {
          console.log('[DaoRoute] No station found, treating as token ID:', stationId);

          // Check if this token has a station
          const stationForTokenResult = await tokenService.getStationForToken(stationPrincipal).catch(e => {
            console.warn('[DaoRoute] Station check failed:', e);
            return { success: false, error: e };
          });

          if (stationForTokenResult.success && stationForTokenResult.data) {
            // Token has a station, redirect to it
            const foundStationId = stationForTokenResult.data.toString();
            console.log('[DaoRoute] Found station for token, redirecting:', foundStationId);
            window.location.href = `/${foundStationId}`;
            return;
          }

          // Token exists but has no station - show link station UI
          console.log('[DaoRoute] Token has no station, showing link UI');
          setTokenId(stationId);  // Store as token ID
          setToken({
            canister_id: stationId,
            symbol: stationId.slice(0, 8).toUpperCase(),
            name: `${stationId.slice(0, 8).toUpperCase()} Treasury`
          });
          setOrbitStation(null);  // No station linked
          setError('no-station');  // Special error code to show link UI
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

  // Special case: Token has no station linked - show link UI
  if (error === 'no-station' && token) {
    return (
      <DaoLayout
        token={token}
        orbitStation={null}
        votingPower={0}
        loadingVotingPower={false}
        refreshVotingPower={() => {}}
      >
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-executive-darkGray border border-executive-gold/20 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-display text-executive-ivory mb-4">
              No Orbit Station Linked
            </h2>
            <p className="text-executive-lightGray/80 mb-6">
              This token ({token.symbol}) has locked liquidity in Kong Locker but hasn't been linked to an Orbit Station yet.
            </p>
            <p className="text-executive-lightGray/60 text-sm mb-6">
              To enable governance and treasury management, this token needs to be linked to an Orbit Station through a community proposal.
            </p>
            <div className="bg-executive-charcoal/50 border border-executive-lightGray/10 rounded p-4 mb-6">
              <p className="text-xs text-executive-lightGray/40 font-mono break-all">
                Token ID: {token.canister_id}
              </p>
            </div>
            <p className="text-executive-lightGray/60 text-sm">
              Contact the DAO community to initiate a station linking proposal, or return to the main page.
            </p>
            <button
              onClick={() => window.location.href = '/app'}
              className="mt-6 px-6 py-2 bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight rounded font-semibold"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </DaoLayout>
    );
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
