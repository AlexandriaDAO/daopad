import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useDispatch } from 'react-redux';
import { DAOPadBackendService } from '../services/daopadBackend';
import { OrbitStationService } from '../services/orbitStation';
import OrbitUserManager from './OrbitUserManager';
import DAOTransitionManager from './DAOTransitionManager';
import RequestManager from './orbit/RequestManager';
import AccountsPage from './orbit/AccountsPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { upsertStationMapping } from '../features/dao/daoSlice';
import { useActiveStation } from '../hooks/useActiveStation';
import OrbitStationPlaceholder from './orbit/OrbitStationPlaceholder';

const TokenTabContent = ({ token, identity, votingPower, lpPositions, onRefresh }) => {
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
  const [daoStatus, setDaoStatus] = useState(null); // 'real', 'pseudo', 'invalid', null
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
    // Validate DAO status when orbit station is set
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

      // Check if there's a station for this token
      const stationResult = await daopadService.getOrbitStationForToken(tokenPrincipal);
      if (stationResult.success && stationResult.data) {
        const stationText = toPrincipalText(stationResult.data);
        // Station exists
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
        // No station, check for active proposal
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

  const handleCreateProposal = async () => {
    if (!stationId.trim()) {
      setError('Please enter a station ID');
      return;
    }

    // Check voting power on frontend
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

  const validateDaoStatus = async () => {
    if (!orbitStation?.station_id) return;

    try {
      const orbitService = new OrbitStationService(identity, orbitStation.station_id);
      const result = await orbitService.getAllMembersWithRoles();

      if (result.success) {
        const membersList = result.data.members;
        // DAOPad backend canister ID
        const DAOPAD_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';

        // Find all admin members
        const adminMembers = membersList.filter(member =>
          member.roles.includes('Admin') ||
          member.roles.includes('System Admin')
        );

        // Check if DAOPad backend is an admin
        const daopadIsAdmin = adminMembers.some(member =>
          member.identities && member.identities.some(id =>
            id.toString() === DAOPAD_BACKEND_ID
          )
        );

        if (!daopadIsAdmin) {
          // Backend was removed as admin - invalid DAO
          setDaoStatus('invalid');
        } else if (adminMembers.length === 1) {
          // Only DAOPad backend is admin - real DAO
          setDaoStatus('real');
        } else {
          // Multiple admins including DAOPad - pseudo DAO
          setDaoStatus('pseudo');
        }
      }
    } catch (err) {
      console.error('Error validating DAO status:', err);
      setDaoStatus(null);
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
        await loadTokenStatus(); // Refresh to get updated proposal status
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
    // Use the total USD balance of the entire LP position
    return sum + (pos.usd_balance || 0);
  }, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-executive-darkGray border-executive-gold/20">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-start gap-4">
                {/* Token Logo */}
                {token.canister_id === 'ysy5f-2qaaa-aaaap-qkmmq-cai' ? (
                  <img
                    src="/alex.png"
                    alt="ALEX"
                    className="w-16 h-16 rounded-lg object-contain flex-shrink-0"
                  />
                ) : tokenMetadata?.logo && tokenMetadata.logo !== 'data:image/svg+xml;base64,' ? (
                  <img
                    src={tokenMetadata.logo}
                    alt={tokenMetadata?.symbol || token.symbol}
                    className="w-16 h-16 rounded-lg object-contain flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-executive-mediumGray flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-executive-gold">
                      {(tokenMetadata?.symbol || token.symbol)?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div>
                    <CardTitle className="text-3xl text-executive-ivory">
                      {tokenMetadata?.name || token.symbol}
                    </CardTitle>
                    {tokenMetadata?.description && tokenMetadata.description !== token.symbol && (
                      <p className="text-base text-executive-lightGray mt-1">
                        {tokenMetadata.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-executive-mediumGray border-executive-gold/30">
                      {tokenMetadata?.symbol || token.symbol}
                    </Badge>
                    <Badge variant="outline" className="bg-executive-mediumGray border-executive-gold/30">
                      {token.chain}
                    </Badge>
                    {tokenMetadata?.decimals && (
                      <Badge variant="outline" className="bg-executive-mediumGray border-executive-gold/30">
                        {tokenMetadata.decimals} decimals
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-executive-mediumGray text-executive-lightGray p-2 rounded font-mono">{token.canister_id}</code>
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
                      className="text-executive-gold hover:text-executive-goldLight"
                      title="Copy canister ID"
                    >
                      {copyFeedback ? '✓' : '⧉'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right ml-4">
              <div className="text-3xl font-bold font-mono text-executive-gold">{votingPower.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground font-mono">Voting Power</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-executive-darkGray border-executive-gold/20">
        <CardHeader>
          <CardTitle className="text-executive-ivory">Voting Power</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Total USD Value</Label>
              <div className="font-mono font-bold">{formatUsdValue(totalUsdValue)}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Voting Power</Label>
              <div className="font-mono font-bold">{votingPower.toLocaleString()} VP</div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">LP Positions</Label>
              <div className="font-mono font-bold">{lpPositions.length} position{lpPositions.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {lpPositions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Your LP Positions</Label>
              <div className="space-y-2">
                {lpPositions.map((pos, index) => (
                  <Card key={index}>
                    <CardContent className="pt-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{pos.name}</div>
                          <div className="text-sm text-muted-foreground">{pos.symbol_0}/{pos.symbol_1}</div>
                        </div>
                        <Badge variant="secondary">
                          {formatUsdValue(pos.usd_balance || 0)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-executive-darkGray border-executive-gold/20">
        <CardHeader>
          <CardTitle className="text-executive-ivory">Treasury Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orbitStation ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓ Active</Badge>
                  <span className="font-semibold">{orbitStation.name}</span>
                </div>

                {daoStatus && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={
                          `p-3 rounded-lg border-2 cursor-help transition-all ${
                            daoStatus === 'real'
                              ? 'bg-green-50 border-green-500 hover:bg-green-100'
                              : daoStatus === 'pseudo'
                              ? 'bg-yellow-50 border-yellow-500 hover:bg-yellow-100'
                              : 'bg-red-50 border-red-500 hover:bg-red-100'
                          }`
                        }>
                          <div className="flex items-center gap-3">
                            <div className={
                              `text-2xl font-bold ${
                                daoStatus === 'real'
                                  ? 'text-green-600'
                                  : daoStatus === 'pseudo'
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`
                            }>
                              {daoStatus === 'real' && '✓'}
                              {daoStatus === 'pseudo' && '⚠️'}
                              {daoStatus === 'invalid' && '✗'}
                            </div>
                            <div className="flex-1">
                              <div className={
                                `font-semibold text-lg ${
                                  daoStatus === 'real'
                                    ? 'text-green-800'
                                    : daoStatus === 'pseudo'
                                    ? 'text-yellow-800'
                                    : 'text-red-800'
                                }`
                              }>
                                {daoStatus === 'real' && 'Fully Decentralized DAO'}
                                {daoStatus === 'pseudo' && 'Pseudo-DAO (Multiple Admins)'}
                                {daoStatus === 'invalid' && 'Invalid DAO Configuration'}
                              </div>
                              <div className={
                                `text-sm mt-1 ${
                                  daoStatus === 'real'
                                    ? 'text-green-600'
                                    : daoStatus === 'pseudo'
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`
                              }>
                                {daoStatus === 'real' && 'All decisions require community voting'}
                                {daoStatus === 'pseudo' && 'Some decisions bypass voting'}
                                {daoStatus === 'invalid' && 'Governance link broken'}
                              </div>
                            </div>
                            <div className="text-gray-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm p-4">
                        <div className="space-y-2">
                          <div className="font-semibold">
                            {daoStatus === 'real' && 'Fully Decentralized DAO'}
                            {daoStatus === 'pseudo' && 'Pseudo-DAO Configuration'}
                            {daoStatus === 'invalid' && 'Invalid DAO Setup'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {daoStatus === 'real' && (
                              <>The DAOPad backend is the <strong>only admin</strong>, ensuring all treasury decisions require community voting through proposals. This is true decentralized governance.</>
                            )}
                            {daoStatus === 'pseudo' && (
                              <>While DAOPad can execute community decisions, <strong>other admins exist</strong> who can make unilateral changes without voting. This reduces decentralization.</>
                            )}
                            {daoStatus === 'invalid' && (
                              <>The DAOPad backend <strong>has been removed as admin</strong>, breaking the governance link. Community votes cannot be executed. Manual intervention required.</>
                            )}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Station ID</Label>
                  <code className="block text-xs bg-muted p-2 rounded font-mono">
                    {orbitStation.station_id.toString()}
                  </code>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              {/* Treasury Accounts Section */}
              <AccountsPage
                token={token}
                identity={identity}
                orbitStation={orbitStation}
              />

              {!showJoinForm && userVotingPower >= 100 && (
                <div className="flex">
                  <Button
                    onClick={() => setShowJoinForm(true)}
                    variant="outline"
                  >
                    Join as Member
                  </Button>
                </div>
              )}

              {showJoinForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Join {orbitStation.name} as Member</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      You have {userVotingPower?.toLocaleString()} VP for {token.symbol}.
                      Minimum 100 VP required.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
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
                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-destructive text-sm">{error}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleJoinAsMember}
                        disabled={joiningAsMember || !memberName.trim()}
                        className="flex-1"
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
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* User Management Section */}
              <OrbitUserManager
                token={token}
                identity={identity}
                orbitStation={orbitStation}
              />

              {/* DAO Transition Management Section */}
              <DAOTransitionManager
                token={token}
                identity={identity}
                orbitStation={orbitStation}
              />

              {/* Request Manager */}
              <RequestManager
                token={token}
                identity={identity}
              />
            </div>
          ) : activeProposal ? (
            // Active proposal exists - show voting interface
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">🗳️ Active Proposal</Badge>
                </div>
                <p className="text-muted-foreground">
                  Community voting on linking {token.symbol} to Orbit Station
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Proposal #{Number(activeProposal.id)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Station ID</Label>
                      <code className="block text-xs bg-muted p-2 rounded font-mono">
                        {activeProposal.station_id.toString()}
                      </code>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Proposed by</Label>
                      <code className="block text-xs bg-muted p-2 rounded font-mono">
                        {activeProposal.proposer.toString()}
                      </code>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Expires</Label>
                      <div className="text-sm">
                        {new Date(Number(activeProposal.expires_at) / 1_000_000).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Voting Statistics */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Voting Progress</h3>

                      {/* Vote counts in clear layout */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Yes Votes</p>
                          <p className="text-2xl font-bold text-green-600">
                            {Number(activeProposal.yes_votes).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">VP</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">No Votes</p>
                          <p className="text-2xl font-bold text-red-600">
                            {Number(activeProposal.no_votes).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">VP</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Power</p>
                          <p className="text-2xl font-bold">
                            {Number(activeProposal.total_voting_power).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">VP</p>
                        </div>
                      </div>

                      {/* Progress bars for Pass and Reject thresholds */}
                      <div className="space-y-4">
                        {/* Pass threshold progress */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Pass Threshold (&gt;50%)</span>
                            <span className="text-sm text-muted-foreground">
                              {((Number(activeProposal.yes_votes) / Number(activeProposal.total_voting_power)) * 100).toFixed(1)}% of total
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, (Number(activeProposal.yes_votes) / (Number(activeProposal.total_voting_power) * 0.5)) * 100)}
                            className="h-3 bg-gray-200"
                            indicatorClassName="bg-green-500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {Number(activeProposal.yes_votes).toLocaleString()} / {Math.floor(Number(activeProposal.total_voting_power) / 2).toLocaleString()} VP needed
                          </p>
                        </div>

                        {/* Reject threshold progress */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Reject Threshold (&gt;33.34%)</span>
                            <span className="text-sm text-muted-foreground">
                              {((Number(activeProposal.no_votes) / Number(activeProposal.total_voting_power)) * 100).toFixed(1)}% of total
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, (Number(activeProposal.no_votes) / (Number(activeProposal.total_voting_power) * 0.3334)) * 100)}
                            className="h-3 bg-gray-200"
                            indicatorClassName="bg-red-500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {Number(activeProposal.no_votes).toLocaleString()} / {Math.floor(Number(activeProposal.total_voting_power) / 3).toLocaleString()} VP needed
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-destructive text-sm">{error}</p>
                    </div>
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
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-blue-800 text-sm">✓ You have already voted on this proposal</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            // No station and no proposal - show propose form
            <div className="space-y-4">
              <OrbitStationPlaceholder
                tokenSymbol={token.symbol}
                status={activeStation.status}
                error={activeStation.status === 'error' ? (activeStation.error || error) : null}
                className="border-executive-gold/30"
              >
                <p className="mt-2 text-xs text-executive-lightGray/60">
                  Once a treasury is linked, governance requests and membership workflows will activate automatically.
                </p>
              </OrbitStationPlaceholder>

              <Card>
                <CardContent className="pt-4">
                  {loadingVP ? (
                    <p className="text-muted-foreground">Loading voting power...</p>
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
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-2">
                    Minimum 10,000 VP required to propose station linking
                  </p>
                </CardContent>
              </Card>

              {!showProposeForm ? (
                <Button
                  onClick={() => setShowProposeForm(true)}
                  disabled={userVotingPower !== null && userVotingPower < 10000}
                  className="w-full"
                  size="lg"
                >
                  Propose Station Link
                </Button>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Propose Station Link</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Propose linking an existing Orbit Station to {token.symbol}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="station-id">Station ID</Label>
                      <Input
                        id="station-id"
                        type="text"
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        placeholder="Enter Orbit Station canister ID"
                        disabled={creating}
                      />
                      <p className="text-xs text-muted-foreground">
                        The canister ID of the Orbit Station (e.g., rdmx6-jaaaa-aaaah-qcaaa-cai)
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-destructive text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateProposal}
                        disabled={creating || !stationId.trim()}
                        className="flex-1"
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
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenTabContent;
