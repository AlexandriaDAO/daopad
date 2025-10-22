import React, { useState, useEffect, memo, useMemo } from 'react';
import { Principal } from '@dfinity/principal';
import { useDispatch } from 'react-redux';
import { getProposalService, getTokenService, getKongLockerService, getOrbitUserService } from '../services/backend';
import AccountsTable from './tables/AccountsTable';
import UnifiedRequests from './orbit/UnifiedRequests';
import AddressBookPage from '../pages/AddressBookPage';
import PermissionsPage from '../pages/PermissionsPage';
import DAOSettings from './DAOSettings';
import CanistersTab from './canisters/CanistersTab';
import SecurityDashboard from './security/SecurityDashboard';
import OperatingAgreementTab from './operating-agreement/OperatingAgreementTab';
import TokenHeader from './token/TokenHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { upsertStationMapping } from '../features/dao/daoSlice';
import { useActiveStation } from '../hooks/useActiveStation';
import { useTokenMetadata } from '../hooks/useTokenMetadata';
import OrbitStationPlaceholder from './orbit/OrbitStationPlaceholder';

const TokenDashboard = memo(function TokenDashboard({
  token,
  tokens = null,
  activeTokenIndex = 0,
  onTokenChange = null,
  tokenVotingPowers = null,
  identity,
  votingPower,
  lpPositions,
  onRefresh
}) {
  const dispatch = useDispatch();
  const activeStation = useActiveStation(token?.canister_id);
  const [orbitStation, setOrbitStation] = useState(null);
  const [activeProposal, setActiveProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [stationId, setStationId] = useState('');
  const [userVotingPower, setUserVotingPower] = useState(null);
  const [loadingVP, setLoadingVP] = useState(false);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [daoStatus, setDaoStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [totalVotingPower, setTotalVotingPower] = useState(null);
  const [loadingTotalVP, setLoadingTotalVP] = useState(false);

  // Use custom hook for token metadata
  const { tokenMetadata, loading: loadingMetadata } = useTokenMetadata(token);

  const toPrincipalText = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value?.toText === 'function') return value.toText();
    if (typeof value?.toString === 'function') return value.toString();
    return String(value);
  };

  useEffect(() => {
    loadTokenStatus();
    loadVotingPower();
    loadTotalVotingPower();
  }, [token]);

  useEffect(() => {
    if (orbitStation?.station_id) {
      validateDaoStatus();
    } else {
      setDaoStatus(null);
    }
  }, [orbitStation]);

  const loadVotingPower = async () => {
    if (!identity || !token) return;

    setLoadingVP(true);
    try {
      const tokenService = getTokenService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await tokenService.getMyVotingPowerForToken(tokenPrincipal);
      if (result.success) {
        // Convert BigInt to number for voting power
        const vp = typeof result.data === 'bigint' ? Number(result.data) : result.data;
        setUserVotingPower(vp);
      }
    } catch (err) {
      console.error('Failed to load voting power:', err);
    } finally {
      setLoadingVP(false);
    }
  };

  const loadTotalVotingPower = async () => {
    if (!identity || !token) return;

    setLoadingTotalVP(true);
    try {
      const tokenService = getTokenService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await tokenService.getTotalVotingPowerForToken(tokenPrincipal);
      if (result.success) {
        // Convert BigInt to number for voting power
        const totalVp = typeof result.data === 'bigint' ? Number(result.data) : result.data;
        setTotalVotingPower(totalVp);
      }
    } catch (err) {
      console.error('Failed to load total voting power:', err);
    } finally {
      setLoadingTotalVP(false);
    }
  };

  const loadTokenStatus = async () => {
    if (!identity || !token) return;

    setLoading(true);
    setError('');

    try {
      const tokenService = getTokenService(identity);
      const daopadService = getProposalService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const stationResult = await tokenService.getStationForToken(tokenPrincipal);
      if (stationResult.success && stationResult.data) {
        const stationText = toPrincipalText(stationResult.data);
        setOrbitStation({
          station_id: stationText,
          name: `${token.symbol} Treasury`,
        });
        dispatch(upsertStationMapping({
          tokenId: token.canister_id,
          stationId: stationText,
          status: 'linked',
          source: 'token-status',
        }));
        setActiveProposal(null);
      } else {
        setOrbitStation(null);
        const proposalResult = await proposalService.getActiveForToken(tokenPrincipal);
        if (proposalResult.success && proposalResult.data) {
          setActiveProposal(proposalResult.data);
          dispatch(upsertStationMapping({
            tokenId: token.canister_id,
            stationId: null,
            status: 'proposal',
            source: 'token-status',
          }));
        } else {
          setActiveProposal(null);
          dispatch(upsertStationMapping({
            tokenId: token.canister_id,
            stationId: null,
            status: 'missing',
            source: 'token-status',
          }));
        }
      }
    } catch (err) {
      console.error('Error loading token status:', err);
      setError('Failed to load token status');
      dispatch(upsertStationMapping({
        tokenId: token?.canister_id,
        stationId: null,
        status: 'error',
        source: 'token-status',
        error: err?.message || 'Failed to load token status',
      }));
    } finally {
      setLoading(false);
    }
  };

  const validateDaoStatus = async () => {
    if (!orbitStation?.station_id) return;

    try {
      const userService = getOrbitUserService(identity);
      const result = await userService.listUsers(orbitStation.station_id, {});

      if (result.success) {
        const membersList = result.data.members;
        const DAOPAD_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';

        const adminMembers = membersList.filter(member =>
          member.roles.includes('Admin') ||
          member.roles.includes('System Admin')
        );

        const daopadIsAdmin = adminMembers.some(member =>
          member.identities && member.identities.some(id =>
            id.toString() === DAOPAD_BACKEND_ID
          )
        );

        if (!daopadIsAdmin) {
          setDaoStatus('invalid');
        } else if (adminMembers.length === 1) {
          setDaoStatus('real');
        } else {
          setDaoStatus('pseudo');
        }
      }
    } catch (err) {
      console.error('Error validating DAO status:', err);
      setDaoStatus(null);
    }
  };

  const handleCreateProposal = async () => {
    if (!stationId.trim()) {
      setError('Please enter a station ID');
      return;
    }

    const vpValue = typeof userVotingPower === 'bigint' ? Number(userVotingPower) : (userVotingPower || 0);
    if (userVotingPower !== null && vpValue < 10000) {
      setError(`Insufficient voting power. You have ${vpValue.toLocaleString()} VP but need at least 10,000 VP.`);
      return;
    }

    setCreating(true);
    setError('');

    try {
      const proposalService = getProposalService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const stationPrincipal = Principal.fromText(stationId.trim());

      const result = await proposalService.proposeOrbitStationLink(tokenPrincipal, stationPrincipal);

      if (result.success) {
        await loadTokenStatus();
        setShowProposeForm(false);
        setStationId('');
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError(result.error || 'Failed to create proposal');
      }
    } catch (err) {
      console.error('Error creating proposal:', err);
      setError(err.message || 'An error occurred while creating the proposal');
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (vote) => {
    if (!activeProposal) return;

    setVoting(true);
    setError('');

    try {
      const proposalService = getProposalService(identity);
      const result = await proposalService.voteOnOrbitProposal(activeProposal.id, vote);

      if (result.success) {
        await loadTokenStatus();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError(result.error || 'Failed to vote');
      }
    } catch (err) {
      console.error('Error voting:', err);
      setError(err.message || 'An error occurred while voting');
    } finally {
      setVoting(false);
    }
  };


  const formatUsdValue = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // VP to USD conversion helper
  const VP_TO_USD_RATIO = 100;
  const vpToUsd = (vp) => {
    const numericVp = typeof vp === 'bigint' ? Number(vp) : (vp || 0);
    return formatUsdValue(numericVp / VP_TO_USD_RATIO);
  };

  // Calculate USD value from voting power (VP = USD * 100, so USD = VP / 100)
  // Fall back to positions if available
  const totalUsdValue = useMemo(() => {
    // If we have voting power, calculate USD from it
    const vpNum = typeof votingPower === 'bigint' ? Number(votingPower) : (votingPower || 0);
    if (vpNum > 0) {
      return vpNum / VP_TO_USD_RATIO;
    }

    // Otherwise fall back to positions
    return (lpPositions || []).reduce((sum, pos) => {
      return sum + (pos.usd_balance || 0);
    }, 0);
  }, [votingPower, lpPositions]);

  const vpPercentage = useMemo(() => {
    const numericVP = typeof votingPower === 'bigint' ? Number(votingPower) : votingPower;
    const numericTotal = typeof totalVotingPower === 'bigint' ? Number(totalVotingPower) : totalVotingPower;

    if (!numericVP || !numericTotal || numericTotal === 0) {
      return null;
    }
    return ((numericVP / numericTotal) * 100).toFixed(2);
  }, [votingPower, totalVotingPower]);

  // Memoize token USD calculations for performance
  const tokenUsdValues = React.useMemo(() => {
    if (!tokens || !lpPositions) return {};
    const values = {};
    tokens.forEach(t => {
      const tokenPositions = lpPositions.filter(pos =>
        pos.address_0 === t.canister_id || pos.address_1 === t.canister_id
      );
      values[t.canister_id] = tokenPositions.reduce((sum, pos) =>
        sum + (pos.usd_balance || 0), 0
      );
    });
    return values;
  }, [tokens, lpPositions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TokenHeader
        token={token}
        tokenMetadata={tokenMetadata}
        tokens={tokens}
        activeTokenIndex={activeTokenIndex}
        onTokenChange={onTokenChange}
        tokenVotingPowers={tokenVotingPowers}
        tokenUsdValues={tokenUsdValues}
        totalUsdValue={totalUsdValue}
        votingPower={votingPower}
        totalVotingPower={totalVotingPower}
        vpPercentage={vpPercentage}
        formatUsdValue={formatUsdValue}
        orbitStation={orbitStation}
        daoStatus={daoStatus}
      />

      {/* Main Content */}
      {orbitStation ? (
        <>
          {/* Tabs for different views */}
          <Tabs defaultValue="agreement" className="w-full" onValueChange={(value) => setActiveTab(value)}>
            <div className="flex items-center gap-3 mb-6">
              <TabsList variant="executive" className="flex-1 grid grid-cols-5">
                <TabsTrigger variant="executive" value="agreement">Agreement</TabsTrigger>
                <TabsTrigger variant="executive" value="accounts">Treasury</TabsTrigger>
                <TabsTrigger variant="executive" value="activity">Activity</TabsTrigger>
                <TabsTrigger variant="executive" value="canisters" data-testid="canisters-tab">Canisters</TabsTrigger>
                <TabsTrigger variant="executive" value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={loadTokenStatus}
                className="ml-3 border-executive-gold/40 hover:bg-executive-gold/10 hover:border-executive-gold/60"
                title="Refresh data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
              </Button>
            </div>

            <TabsContent value="accounts" className="mt-4 space-y-6">
              {activeTab === 'accounts' && (
                <>
                  <AccountsTable
                    stationId={orbitStation.station_id}
                    identity={identity}
                    tokenId={token.canister_id}
                    tokenSymbol={token.symbol}
                    votingPower={votingPower}
                  />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Saved Addresses</h3>
                      <span className="text-sm text-muted-foreground">Manage addresses for easy transfers</span>
                    </div>
                    <AddressBookPage identity={identity} />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <UnifiedRequests tokenId={token.canister_id} identity={identity} />
            </TabsContent>

            <TabsContent value="canisters" className="mt-4">
              {activeTab === 'canisters' && (
                <CanistersTab token={token} stationId={orbitStation?.station_id} identity={identity} />
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              {activeTab === 'settings' && (
                <DAOSettings
                  tokenCanisterId={token.canister_id}
                  identity={identity}
                  stationId={orbitStation?.station_id}
                  tokenSymbol={token.symbol}
                  tokenId={token.canister_id}
                />
              )}
            </TabsContent>

            <TabsContent value="agreement" className="mt-4">
              {activeTab === 'agreement' && (
                <OperatingAgreementTab
                  tokenId={token.canister_id}
                  stationId={orbitStation?.station_id}
                  tokenSymbol={token.symbol}
                  identity={identity}
                />
              )}
            </TabsContent>

          </Tabs>
        </>
      ) : activeProposal ? (
        // Active proposal voting interface
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              <div className="font-semibold">🗳️ Active Proposal #{Number(activeProposal.id)}</div>
              <div className="text-sm">Community voting on linking {token.symbol} to Orbit Station</div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Number(activeProposal.yes_votes).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Yes Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{Number(activeProposal.no_votes).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">No Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Number(activeProposal.total_voting_power).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Power</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Pass Threshold (&gt;50%)</span>
              <span>{((Number(activeProposal.yes_votes) / Number(activeProposal.total_voting_power)) * 100).toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, (Number(activeProposal.yes_votes) / (Number(activeProposal.total_voting_power) * 0.5)) * 100)} />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {(() => {
            const vpValue = typeof userVotingPower === 'bigint' ? Number(userVotingPower) : (userVotingPower || 0);
            return vpValue > 0 && !activeProposal.voters.includes(identity?.getPrincipal?.()) && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleVote(true)}
                  disabled={voting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {voting ? 'Voting...' : (
                    <span>
                      Vote Yes ({vpValue.toLocaleString()} VP / {vpToUsd(vpValue)})
                    </span>
                  )}
                </Button>
                <Button
                  onClick={() => handleVote(false)}
                  disabled={voting}
                  variant="destructive"
                  className="flex-1"
                >
                  {voting ? 'Voting...' : (
                    <span>
                      Vote No ({vpValue.toLocaleString()} VP / {vpToUsd(vpValue)})
                    </span>
                  )}
                </Button>
              </div>
            );
          })()}

          {activeProposal.voters.includes(identity?.getPrincipal?.()) && (
            <Alert>
              <AlertDescription>✓ You have already voted on this proposal</AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        // No station, no proposal - show propose interface
        <div className="space-y-4">
          <OrbitStationPlaceholder
            tokenSymbol={token.symbol}
            status={activeStation.status}
            error={activeStation.status === 'error' ? (activeStation.error || error) : null}
          />

          {!showProposeForm ? (
            <div className="text-center">
              {loadingVP ? (
                <div className="text-muted-foreground">Loading voting power...</div>
              ) : userVotingPower !== null ? (
                <div className="space-y-2">
                  {/* Show VP with USD equivalent */}
                  {(() => {
                    const vpValue = typeof userVotingPower === 'bigint' ? Number(userVotingPower) : (userVotingPower || 0);
                    return (
                      <div className={vpValue >= 10000 ? 'text-green-600' : 'text-red-600'}>
                        Your voting power: <strong>{vpValue.toLocaleString()} VP</strong>
                        <span className="text-sm ml-2">
                          ({vpToUsd(vpValue)})
                        </span>
                      </div>
                    );
                  })()}

                  {/* If insufficient VP, show USD needed too */}
                  {(() => {
                    const vpValue = typeof userVotingPower === 'bigint' ? Number(userVotingPower) : (userVotingPower || 0);
                    const vpNeeded = 10000 - vpValue;
                    return vpValue < 10000 && (
                      <div className="space-y-1">
                        <Badge variant="destructive">
                          Need {vpNeeded.toLocaleString()} more VP
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          That's {vpToUsd(vpNeeded)} more LP value needed
                        </div>
                      </div>
                    );
                  })()}

                  {/* Explanation text */}
                  <div className="text-xs text-muted-foreground">
                    Minimum 10,000 VP ({formatUsdValue(100)}) required to propose station linking
                  </div>
                </div>
              ) : null}
              <Button
                onClick={() => setShowProposeForm(true)}
                disabled={userVotingPower !== null && (typeof userVotingPower === 'bigint' ? Number(userVotingPower) : userVotingPower) < 10000}
                className="mt-4"
                size="lg"
              >
                Propose Station Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="station-id">Station ID</Label>
                <Input
                  id="station-id"
                  type="text"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  placeholder="Enter Orbit Station canister ID"
                  disabled={creating}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  The canister ID of the Orbit Station (e.g., rdmx6-jaaaa-aaaah-qcaaa-cai)
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateProposal}
                  disabled={creating || !stationId.trim()}
                >
                  {creating ? 'Creating...' : 'Create Proposal'}
                </Button>
                <Button
                  onClick={() => {
                    setShowProposeForm(false);
                    setStationId('');
                    setError('');
                  }}
                  disabled={creating}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props changed
  // Note: tokenVotingPowers excluded as it's typically a stable reference
  // If it changes, a re-render is acceptable and rare
  return (
    prevProps.token?.canister_id === nextProps.token?.canister_id &&
    prevProps.activeTokenIndex === nextProps.activeTokenIndex &&
    prevProps.votingPower === nextProps.votingPower &&
    prevProps.lpPositions === nextProps.lpPositions && // Reference equality is sufficient
    prevProps.tokens === nextProps.tokens // Reference equality is sufficient
  );
});

export default TokenDashboard;