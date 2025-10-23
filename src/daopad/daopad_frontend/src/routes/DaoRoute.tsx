import React, { useState, useEffect } from 'react';
import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { getTokenService } from '../services/backend';
import DaoLayout from '../components/dao/DaoLayout';
import { FallbackLoader } from '../components/ui/fallback-loader';

export default function DaoRoute() {
  const { tokenId } = useParams();
  const { identity, isAuthenticated } = useSelector((state: any) => state.auth);
  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orbitStation, setOrbitStation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch station info (works for both authenticated and anonymous)
        try {
          const stationResult = await tokenService.getStationForToken(principal);
          console.log('[DaoRoute] Station result:', stationResult);

          if (stationResult.success && stationResult.data) {
            const stationId = typeof stationResult.data === 'string'
              ? stationResult.data
              : stationResult.data.toString();

            setOrbitStation({
              station_id: stationId,
              name: `${tokenId} Treasury`
            });
          }
        } catch (e) {
          console.warn('[DaoRoute] Could not fetch station:', e);
          // Don't fail - DAO might not have station yet
        }

        // Fetch token metadata if authenticated
        if (isAuthenticated && identity) {
          try {
            const metadataResult = await tokenService.getTokenMetadata(principal);
            console.log('[DaoRoute] Metadata result:', metadataResult);

            if (metadataResult.success && metadataResult.data) {
              setToken({
                canister_id: tokenId,
                symbol: metadataResult.data.symbol || tokenId.slice(0, 5).toUpperCase(),
                name: metadataResult.data.name || 'Token'
              });
            } else {
              // Fallback if metadata fetch fails
              setToken({
                canister_id: tokenId,
                symbol: tokenId.slice(0, 5).toUpperCase(),
                name: 'Token'
              });
            }
          } catch (e) {
            console.warn('[DaoRoute] Could not fetch metadata:', e);
            // Fallback token object
            setToken({
              canister_id: tokenId,
              symbol: tokenId.slice(0, 5).toUpperCase(),
              name: 'Token'
            });
          }
        } else {
          // Anonymous users get basic token object
          setToken({
            canister_id: tokenId,
            symbol: tokenId.slice(0, 5).toUpperCase(),
            name: 'Token'
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
    <DaoLayout token={token} orbitStation={orbitStation}>
      <Outlet context={{ token, orbitStation, identity, isAuthenticated }} />
    </DaoLayout>
  );
}
