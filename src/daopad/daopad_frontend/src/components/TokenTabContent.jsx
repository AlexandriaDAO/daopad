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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [stationName, setStationName] = useState('');
  const [userVotingPower, setUserVotingPower] = useState(null);
  const [loadingVP, setLoadingVP] = useState(false);
  const [joiningAsMember, setJoiningAsMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    loadOrbitStationStatus();
    loadVotingPower();
    setStationName(`${token.symbol} Treasury`);
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

  const loadOrbitStationStatus = async () => {
    if (!identity || !token) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      // Check if there's a station for this token
      const result = await daopadService.getOrbitStationForToken(tokenPrincipal);
      if (result.success && result.data) {
        setOrbitStation(result.data);
      } else {
        setOrbitStation(null);
      }
    } catch (err) {
      console.error('Error loading orbit station:', err);
      setError('Failed to load Orbit Station status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStation = async () => {
    if (!stationName.trim()) {
      setError('Please enter a station name');
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
      const result = await daopadService.createTokenOrbitStation(stationName.trim(), tokenPrincipal);

      if (result.success) {
        await loadOrbitStationStatus();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError(result.error || 'Failed to create Orbit Station');
      }
    } catch (err) {
      console.error('Error creating station:', err);
      setError(err.message || 'An error occurred while creating the station');
    } finally {
      setCreating(false);
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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{token.symbol}</CardTitle>
              <Badge variant="outline">{token.chain}</Badge>
              <code className="block text-xs bg-muted p-2 rounded font-mono">{token.canister_id}</code>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">{votingPower.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground font-mono">Voting Power</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voting Power</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Treasury Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orbitStation ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓ Active</Badge>
                  <span className="font-semibold">{orbitStation.name || 'Unnamed Station'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Station ID</Label>
                  <code className="block text-xs bg-muted p-2 rounded font-mono">
                    {orbitStation.station_id.toString()}
                  </code>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Upgrader ID</Label>
                  <code className="block text-xs bg-muted p-2 rounded font-mono">
                    {orbitStation.upgrader_id.toString()}
                  </code>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Created</Label>
                  <div className="font-mono text-sm">
                    {new Date(Number(orbitStation.created_at) / 1000000).toLocaleDateString()}
                  </div>
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
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">○ No Station</Badge>
                </div>
                <p className="text-muted-foreground">Create treasury for {token.symbol} governance.</p>
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
                    Minimum 10,000 VP required to create an Orbit Station
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="station-name">Name</Label>
                  <Input
                    id="station-name"
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder={`${token.symbol} Treasury`}
                    maxLength={50}
                    disabled={creating || (userVotingPower !== null && userVotingPower < 10000)}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleCreateStation}
                  disabled={creating || !stationName.trim() || (userVotingPower !== null && userVotingPower < 10000)}
                  className="w-full"
                  size="lg"
                  title={userVotingPower !== null && userVotingPower < 10000 ? 'Insufficient voting power' : ''}
                >
                  {creating ? 'Creating...' : 'Create Treasury'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenTabContent;