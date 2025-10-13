import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Loader2 } from 'lucide-react';

// Voting power tier thresholds
const TIERS = [
  { name: 'None', min: 0, max: 0, color: 'secondary', description: 'No voting power' },
  { name: 'Observer', min: 1, max: 99, color: 'secondary', description: 'Can view proposals' },
  { name: 'Participant', min: 100, max: 999, color: 'default', description: 'Can vote and create proposals' },
  { name: 'Contributor', min: 1000, max: 9999, color: 'default', description: 'Active governance participant' },
  { name: 'Governor', min: 10000, max: Infinity, color: 'default', description: 'Major stakeholder' },
];

export default function VotingTierDisplay({ tokenId, identity, kongLockerActor }) {
  const [votingPower, setVotingPower] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tokenId && identity && kongLockerActor) {
      loadVotingPower();
    }
  }, [tokenId, identity, kongLockerActor]);

  async function loadVotingPower() {
    setLoading(true);
    setError(null);

    try {
      // Query Kong Locker for user's voting power
      // Note: This would require the Kong Locker actor to be passed down
      // For now, we'll use a placeholder
      const userPrincipal = identity.getPrincipal();

      // Placeholder - in real implementation, query Kong Locker
      // const result = await kongLockerActor.get_user_voting_power(tokenId, userPrincipal);

      // For now, set to 0
      setVotingPower(0);
    } catch (err) {
      console.error('Failed to load voting power:', err);
      setError(err.message || 'Failed to load voting power');
    } finally {
      setLoading(false);
    }
  }

  function calculateTier(vp) {
    return TIERS.find(tier => vp >= tier.min && vp <= tier.max) || TIERS[0];
  }

  function getNextTier(currentTier) {
    const currentIndex = TIERS.findIndex(t => t.name === currentTier.name);
    return currentIndex < TIERS.length - 1 ? TIERS[currentIndex + 1] : null;
  }

  function calculateProgress(vp, currentTier, nextTier) {
    if (!nextTier) return 100;
    const range = nextTier.min - currentTier.min;
    const progress = vp - currentTier.min;
    return Math.min(100, (progress / range) * 100);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-destructive text-sm">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  const currentTier = calculateTier(votingPower);
  const nextTier = getNextTier(currentTier);
  const progress = calculateProgress(votingPower, currentTier, nextTier);
  const vpNeeded = nextTier ? nextTier.min - votingPower : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Voting Power</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold">
          {votingPower.toLocaleString()} VP
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={currentTier.color}>{currentTier.name}</Badge>
          <span className="text-sm text-muted-foreground">{currentTier.description}</span>
        </div>

        {nextTier && (
          <>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {vpNeeded.toLocaleString()} VP until {nextTier.name}
            </p>
          </>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Lock more LP tokens in Kong Locker to increase your voting power
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
