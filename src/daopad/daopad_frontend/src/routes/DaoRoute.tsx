import React, { useState, useEffect, useRef } from 'react';
import { useParams, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Principal } from '@dfinity/principal';
import { getTokenService } from '../services/backend';
import { UtilityService } from '../services/backend/utility/UtilityService';
import { getAdminService } from '../services/admin/AdminService';
import DaoLayout from '../components/dao/DaoLayout';
import { FallbackLoader } from '../components/ui/fallback-loader';
import { useVoting } from '../hooks/useVoting';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';

export default function DaoRoute() {
  const { stationId } = useParams();  // Changed from tokenId to stationId
  const { identity, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<any>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);  // Store token ID internally
  const [loading, setLoading] = useState(true);
  const [orbitStation, setOrbitStation] = useState<any>(null);
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState<boolean>(false);
  const [linkStationId, setLinkStationId] = useState<string>('');
  const [linkError, setLinkError] = useState<string>('');
  const [linking, setLinking] = useState<boolean>(false);
  const [isEquityStation, setIsEquityStation] = useState<boolean>(false);

  // Loading guard ref to prevent redundant fetches
  const loadedStationRef = useRef<string | null>(null);

  // Fetch voting power using existing hook (once we have token ID)
  const { userVotingPower, loadingVP, fetchVotingPower } = useVoting(tokenId);

  const MINIMUM_VP_FOR_LINKING = 10000;

  useEffect(() => {
    async function loadStation() {
      if (!stationId) {
        setError('No station ID provided');
        setLoading(false);
        return;
      }

      // Skip if we already loaded this station
      if (loadedStationRef.current === stationId && token) {
        console.log('[DaoRoute] Data already loaded for:', stationId);
        return;
      }

      // Mark as loading
      setLoading(true);
      loadedStationRef.current = stationId;

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

        // 0. Check if this is an equity station first (LLCs don't need token links)
        const adminService = getAdminService(identity);
        const isEquity = await adminService.isEquityStation(stationId).catch(() => false);

        if (isEquity) {
          console.log('[DaoRoute] Loading equity station (no token required):', stationId);

          // For equity stations, create minimal token data and load directly
          const shortId = stationId.slice(0, 8);
          setToken({
            canister_id: stationId,
            symbol: shortId.toUpperCase(),
            name: `${shortId.toUpperCase()} LLC`
          });

          setOrbitStation({
            station_id: stationId,
            name: `${shortId.toUpperCase()} Treasury`
          });

          // For equity stations, use station ID as "token ID" for VP queries
          // The backend will route to equity % instead of Kong Locker
          setTokenId(stationId);
          setIsEquityStation(true);
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
            navigate(`/dao/${foundStationId}`, { replace: true });
            return;
          }

          // Token exists but has no station - fetch metadata and show link station UI
          console.log('[DaoRoute] Token has no station, fetching metadata...');
          setTokenId(stationId);  // Store as token ID

          // Fetch token metadata to get real name and symbol
          const metadataResult = await UtilityService.getTokenMetadata(stationPrincipal).catch(e => {
            console.warn('[DaoRoute] Metadata fetch failed:', e);
            return { success: false, error: e };
          });

          // Use real metadata if available, otherwise fallback to ID
          if (metadataResult.success && metadataResult.data) {
            const symbol = metadataResult.data.symbol?.trim() || stationId.slice(0, 8).toUpperCase();
            const name = metadataResult.data.name?.trim() || `${symbol} Treasury`;

            setToken({
              canister_id: stationId,
              symbol,
              name: name.slice(0, 100) // Limit to 100 chars to prevent UI issues
            });
          } else {
            // Fallback for anonymous or failed metadata
            const shortId = stationId.slice(0, 8);
            setToken({
              canister_id: stationId,
              symbol: shortId.toUpperCase(),
              name: `${shortId.toUpperCase()} Treasury`
            });
          }

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
          // Token metadata (public data)
          UtilityService.getTokenMetadata(tokenPrincipal).catch(e => {
            console.warn('[DaoRoute] Metadata fetch failed:', e);
            return { success: false, error: e };
          }),

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

        // Token-based stations are not equity stations (mutually exclusive)
        setIsEquityStation(false);

        console.log('[DaoRoute] Successfully loaded:', stationId);
        setLoading(false);
      } catch (e) {
        // Clear loaded reference on error
        loadedStationRef.current = null;
        console.error('[DaoRoute] Error loading station:', e);
        setError('Failed to load station data');
        setLoading(false);
      }
    }

    loadStation();
  }, [stationId, identity, isAuthenticated]);

  const handleLinkStation = async () => {
    // Validate identity
    if (!identity) {
      setLinkError('Please authenticate first');
      return;
    }

    // Validate station ID
    if (!linkStationId.trim()) {
      setLinkError('Station ID is required');
      return;
    }

    // Validate principal format
    try {
      Principal.fromText(linkStationId.trim());
    } catch (err) {
      setLinkError('Invalid station ID format');
      return;
    }

    setLinking(true);
    setLinkError('');

    try {
      const tokenService = getTokenService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);
      const stationPrincipal = Principal.fromText(linkStationId.trim());

      const result = await tokenService.linkStation(tokenPrincipal, stationPrincipal);

      if (result.success) {
        // Success - reload page to show linked station
        setShowLinkDialog(false);
        setLinkStationId('');
        setLinkError('');

        // Redirect to station route
        navigate(`/dao/${linkStationId.trim()}`, { replace: true });
      } else {
        setLinkError(result.error || 'Failed to create station link proposal');
      }
    } catch (err) {
      console.error('Error creating station link proposal:', err);
      setLinkError(err.message || 'An error occurred');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return <FallbackLoader />;
  }

  // Special case: Token has no station linked - show link UI
  if (error === 'no-station' && token) {
    const hasMinimumVP = userVotingPower >= MINIMUM_VP_FOR_LINKING;

    return (
      <DaoLayout
        token={token}
        orbitStation={null}
        votingPower={userVotingPower}
        loadingVotingPower={loadingVP}
        refreshVotingPower={fetchVotingPower}
        isEquityStation={false}
      >
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-executive-darkGray border border-executive-gold/20 rounded-lg p-8 text-center space-y-6">
            <h2 className="text-2xl font-display text-executive-ivory mb-4">
              No Orbit Station Linked
            </h2>

            <p className="text-executive-lightGray/80">
              This token ({token.symbol}) has locked liquidity in Kong Locker but hasn't been linked to an Orbit Station yet.
            </p>

            {/* Voting Power Display */}
            <div className="bg-executive-charcoal/50 border border-executive-lightGray/10 rounded p-6">
              <div className="text-sm text-executive-lightGray/60 mb-2">Your Voting Power</div>
              {loadingVP ? (
                <div className="text-executive-gold text-2xl font-bold">Loading...</div>
              ) : (
                <div className="text-executive-gold text-3xl font-bold">
                  {userVotingPower.toLocaleString()} VP
                </div>
              )}
              <div className="text-xs text-executive-lightGray/40 mt-2">
                Minimum required: {MINIMUM_VP_FOR_LINKING.toLocaleString()} VP
              </div>
            </div>

            {/* VP-Based Actions */}
            {hasMinimumVP ? (
              <>
                <p className="text-executive-lightGray/80">
                  You have sufficient voting power to link this token to an Orbit Station.
                </p>
                <button
                  onClick={isAuthenticated ? () => setShowLinkDialog(true) : login}
                  className="px-6 py-3 bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight rounded font-semibold transition-colors"
                >
                  {isAuthenticated ? 'Link Orbit Station' : 'Login to Link Station'}
                </button>
              </>
            ) : (
              <>
                <p className="text-executive-lightGray/60 text-sm">
                  To link an Orbit Station, you need at least {MINIMUM_VP_FOR_LINKING.toLocaleString()} VP.
                  Increase your voting power by locking more LP tokens in Kong Locker.
                </p>
                <a
                  href="https://konglocker.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-executive-gold/20 text-executive-gold border border-executive-gold/30 hover:bg-executive-gold/30 rounded font-semibold"
                >
                  Go to Kong Locker
                </a>
              </>
            )}

            <div className="bg-executive-charcoal/50 border border-executive-lightGray/10 rounded p-4">
              <p className="text-xs text-executive-lightGray/40 font-mono break-all">
                Token ID: {token.canister_id}
              </p>
            </div>

            <button
              onClick={() => navigate('/app')}
              className="text-executive-lightGray/60 hover:text-executive-gold underline text-sm"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* Link Station Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="bg-executive-darkGray border-executive-gold/20">
            <DialogHeader>
              <DialogTitle className="text-executive-ivory">Link Orbit Station</DialogTitle>
              <DialogDescription className="text-executive-lightGray">
                Link an Orbit Station to {token.symbol}.
                Requires 10,000+ voting power.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="station-id" className="text-executive-lightGray">
                  Orbit Station Canister ID
                </Label>
                <Input
                  id="station-id"
                  value={linkStationId}
                  onChange={(e) => setLinkStationId(e.target.value)}
                  placeholder="e.g., fec7w-zyaaa-aaaaa-qaffq-cai"
                  className="bg-executive-mediumGray border-executive-gold/30 text-executive-ivory"
                />
                <p className="text-xs text-executive-lightGray/60 mt-1">
                  The Orbit Station canister to use for DAO governance
                </p>
              </div>

              <div className="bg-executive-charcoal/50 rounded p-3">
                <div className="text-xs text-executive-lightGray/60 space-y-1">
                  <div className="flex justify-between">
                    <span>Token:</span>
                    <span className="font-mono">{token.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your VP:</span>
                    <span className="text-executive-gold">{userVotingPower.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {linkError && (
                <Alert variant="destructive">
                  <AlertDescription>{linkError}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkError('');
                  setLinkStationId('');
                }}
                className="border-executive-gold/30 text-executive-lightGray hover:bg-executive-gold/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkStation}
                disabled={linking || !linkStationId.trim()}
                className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight"
              >
                {linking ? 'Linking Station...' : 'Link Station'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
      isEquityStation={isEquityStation}
    >
      <Outlet context={{
        token,
        orbitStation,
        overviewStats,
        identity,
        isAuthenticated,
        votingPower: userVotingPower,
        loadingVotingPower: loadingVP,
        refreshVotingPower: fetchVotingPower,
        isEquityStation
      }} />
    </DaoLayout>
  );
}
