import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const TokenTabContent = ({ token, identity, votingPower, lpPositions, onRefresh }) => {
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

  useEffect(() => {
    loadTokenStatus();
    loadVotingPower();
  }, [token]);

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
        // Station exists
        setOrbitStation({
          station_id: stationResult.data,
          name: `${token.symbol} Treasury`,
        });
        setActiveProposal(null);
      } else {
        // No station, check for active proposal
        setOrbitStation(null);

        const proposalResult = await daopadService.getActiveProposalForToken(tokenPrincipal);
        if (proposalResult.success && proposalResult.data) {
          setActiveProposal(proposalResult.data);
        } else {
          setActiveProposal(null);
        }
      }
    } catch (err) {
      console.error('Error loading token status:', err);
      setError('Failed to load token status');
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
            <div className="space-y-2">
              <CardTitle className="text-2xl text-executive-ivory">{token.symbol}</CardTitle>
              <Badge variant="outline">{token.chain}</Badge>
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
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">{votingPower.toLocaleString()}</div>
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓ Active</Badge>
                  <span className="font-semibold">{orbitStation.name}</span>
                </div>
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

              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(`https://${orbitStation.station_id}.icp0.io`, '_blank')}
                >
                  Open Treasury
                </Button>
                {!showJoinForm && userVotingPower >= 100 && (
                  <Button
                    onClick={() => setShowJoinForm(true)}
                    variant="outline"
                  >
                    Join as Member
                  </Button>
                )}
              </div>

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

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Voting Progress</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-green-600">Yes Votes</Label>
                        <div className="font-mono font-bold text-green-600">
                          {Number(activeProposal.yes_votes).toLocaleString()} VP
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-red-600">No Votes</Label>
                        <div className="font-mono font-bold text-red-600">
                          {Number(activeProposal.no_votes).toLocaleString()} VP
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Total Voting Power</Label>
                      <div className="font-mono text-sm">
                        {Number(activeProposal.total_voting_power).toLocaleString()} VP
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Approval Progress</Label>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, (Number(activeProposal.yes_votes) / (Number(activeProposal.total_voting_power) / 2)) * 100)}%`
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {((Number(activeProposal.yes_votes) / Number(activeProposal.total_voting_power)) * 100).toFixed(1)}%
                        of total VP (need &gt;50% to pass)
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">○ No Station</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">No treasury exists for {token.symbol}.</p>
                  <p className="text-sm text-muted-foreground">
                    To link a station: Create one at{' '}
                    <a
                      href="https://orbit.orbitcontrol.panel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Orbit Control Panel
                    </a>
                    , then propose linking it here.
                  </p>
                </div>
              </div>

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