import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useDispatch } from 'react-redux';
import { DAOPadBackendService } from '../services/daopadBackend';
import { OrbitStationService } from '../services/orbitStation';
import AccountsTable from './tables/AccountsTable';
import MembersTable from './tables/MembersTable';
import RequestsTable from './tables/RequestsTable';
import UnifiedRequests from './orbit/UnifiedRequests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import OrbitStationPlaceholder from './orbit/OrbitStationPlaceholder';

const TokenDashboard = ({ token, identity, votingPower, lpPositions, onRefresh }) => {
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
  const [joiningAsMember, setJoiningAsMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [daoStatus, setDaoStatus] = useState(null);
  const [tokenMetadata, setTokenMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

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
    loadTokenMetadata();
  }, [token]);

  useEffect(() => {
    if (orbitStation?.station_id) {
      validateDaoStatus();
    } else {
      setDaoStatus(null);
    }
  }, [orbitStation]);

  const loadTokenMetadata = async () => {
    if (!token) return;

    setLoadingMetadata(true);
    try {
      const result = await DAOPadBackendService.getTokenMetadata(token.canister_id);
      if (result.success) {
        setTokenMetadata(result.data);
      }
    } catch (err) {
      console.error('Failed to load token metadata:', err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const loadVotingPower = async () => {
    if (!identity || !token) return;

    setLoadingVP(true);
    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.getMyVotingPowerForToken(tokenPrincipal);
      if (result.success) {
        setUserVotingPower(result.data);
      }
    } catch (err) {
      console.error('Failed to load voting power:', err);
    } finally {
      setLoadingVP(false);
    }
  };

  const loadTokenStatus = async () => {
    if (!identity || !token) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const stationResult = await daopadService.getOrbitStationForToken(tokenPrincipal);
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
        const proposalResult = await daopadService.getActiveProposalForToken(tokenPrincipal);
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
      const orbitService = new OrbitStationService(identity, orbitStation.station_id);
      const result = await orbitService.getAllMembersWithRoles();

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

    if (userVotingPower !== null && userVotingPower < 10000) {
      setError(`Insufficient voting power. You have ${userVotingPower.toLocaleString()} VP but need at least 10,000 VP.`);
      return;
    }

    setCreating(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const stationPrincipal = Principal.fromText(stationId.trim());

      const result = await daopadService.proposeOrbitStationLink(tokenPrincipal, stationPrincipal);

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
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.voteOnOrbitProposal(activeProposal.id, vote);

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

  const handleJoinAsMember = async () => {
    if (!memberName.trim()) {
      setError('Please enter your display name');
      return;
    }

    if (userVotingPower < 100) {
      setError(`Insufficient voting power. You have ${userVotingPower} VP but need at least 100 VP to join.`);
      return;
    }

    setJoiningAsMember(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.joinOrbitStation(tokenPrincipal, memberName.trim());

      if (result.success) {
        setShowJoinForm(false);
        setMemberName('');
        alert('Successfully submitted request to join as a member!');
      } else {
        setError(result.error || 'Failed to join as member');
      }
    } catch (err) {
      console.error('Error joining as member:', err);
      setError(err.message || 'An error occurred while joining');
    } finally {
      setJoiningAsMember(false);
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

  const totalUsdValue = lpPositions.reduce((sum, pos) => {
    return sum + (pos.usd_balance || 0);
  }, 0);

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
      {/* Header Section - Flat design with inline metrics */}
      <header className="flex justify-between items-center pb-4 border-b">
        <div className="flex items-center gap-4">
          {/* Token Logo */}
          {token.canister_id === 'ysy5f-2qaaa-aaaap-qkmmq-cai' ? (
            <img
              src="/alex.png"
              alt="ALEX"
              className="w-12 h-12 rounded-lg object-contain"
            />
          ) : tokenMetadata?.logo && tokenMetadata.logo !== 'data:image/svg+xml;base64,' ? (
            <img
              src={tokenMetadata.logo}
              alt={tokenMetadata?.symbol || token.symbol}
              className="w-12 h-12 rounded-lg object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-xl font-bold">
                {(tokenMetadata?.symbol || token.symbol)?.charAt(0) || '?'}
              </span>
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold">{tokenMetadata?.name || token.symbol}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{tokenMetadata?.symbol || token.symbol}</Badge>
              <Badge variant="outline">{token.chain}</Badge>
              <code className="text-xs bg-muted px-2 py-1 rounded">{token.canister_id}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(token.canister_id);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  } catch (err) {
                    console.error('Failed to copy:', err);
                  }
                }}
                className="h-6 w-6 p-0"
                title="Copy canister ID"
              >
                {copyFeedback ? '✓' : '⧉'}
              </Button>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-mono font-bold">{votingPower.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Voting Power</div>
          <div className="text-sm text-muted-foreground">{formatUsdValue(totalUsdValue)} LP Value</div>
          {orbitStation && (
            <div className="mt-2">
              {daoStatus === 'real' && <Badge className="bg-green-100 text-green-800">✓ Decentralized</Badge>}
              {daoStatus === 'pseudo' && <Badge className="bg-yellow-100 text-yellow-800">⚠️ Pseudo-DAO</Badge>}
              {daoStatus === 'invalid' && <Badge className="bg-red-100 text-red-800">✗ Invalid</Badge>}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      {orbitStation ? (
        <>
          {/* Action Toolbar */}
          <div className="flex gap-2">
            {!showJoinForm && userVotingPower >= 100 && (
              <Button onClick={() => setShowJoinForm(true)} variant="outline">
                Join as Member
              </Button>
            )}
            <Button variant="outline" onClick={loadTokenStatus}>
              Refresh
            </Button>
          </div>

          {/* Join Member Form */}
          {showJoinForm && (
            <Alert>
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="member-name">Display Name</Label>
                    <Input
                      id="member-name"
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="Your name"
                      maxLength={50}
                      disabled={joiningAsMember}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleJoinAsMember}
                      disabled={joiningAsMember || !memberName.trim()}
                      size="sm"
                    >
                      {joiningAsMember ? 'Joining...' : 'Submit Request'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowJoinForm(false);
                        setMemberName('');
                        setError('');
                      }}
                      disabled={joiningAsMember}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs for different views */}
          <Tabs defaultValue="accounts" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="accounts">Treasury Accounts</TabsTrigger>
              <TabsTrigger value="transfers">Transfer Requests</TabsTrigger>
              <TabsTrigger value="members">Members & Roles</TabsTrigger>
              <TabsTrigger value="requests">Governance Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="mt-4">
              <AccountsTable stationId={orbitStation.station_id} identity={identity} tokenId={token.canister_id} />
            </TabsContent>

            <TabsContent value="transfers" className="mt-4">
              <UnifiedRequests tokenId={token.canister_id} identity={identity} />
            </TabsContent>

            <TabsContent value="members" className="mt-4">
              <MembersTable stationId={orbitStation.station_id} identity={identity} token={token} />
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              <RequestsTable tokenId={token.canister_id} identity={identity} />
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

          {userVotingPower > 0 && !activeProposal.voters.includes(identity?.getPrincipal?.()) && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleVote(true)}
                disabled={voting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {voting ? 'Voting...' : `Vote Yes (${userVotingPower?.toLocaleString()} VP)`}
              </Button>
              <Button
                onClick={() => handleVote(false)}
                disabled={voting}
                variant="destructive"
                className="flex-1"
              >
                {voting ? 'Voting...' : `Vote No (${userVotingPower?.toLocaleString()} VP)`}
              </Button>
            </div>
          )}

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
                  <div className={userVotingPower >= 10000 ? 'text-green-600' : 'text-red-600'}>
                    Your voting power: <strong>{userVotingPower.toLocaleString()} VP</strong>
                  </div>
                  {userVotingPower < 10000 && (
                    <Badge variant="destructive">
                      Need {(10000 - userVotingPower).toLocaleString()} more VP
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Minimum 10,000 VP required to propose station linking
                  </div>
                </div>
              ) : null}
              <Button
                onClick={() => setShowProposeForm(true)}
                disabled={userVotingPower !== null && userVotingPower < 10000}
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
};

export default TokenDashboard;