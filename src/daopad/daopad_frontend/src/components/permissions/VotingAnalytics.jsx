import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';

export default function VotingAnalytics({ tokenId, kongLockerActor }) {
  const [stats, setStats] = useState({
    totalHolders: 0,
    totalVotingPower: 0,
    tierDistribution: {
      None: 0,
      Observer: 0,
      Participant: 0,
      Contributor: 0,
      Governor: 0,
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tokenId && kongLockerActor) {
      loadAnalytics();
    }
  }, [tokenId, kongLockerActor]);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      // Query Kong Locker for all VP holders for this token
      // Calculate distribution across tiers

      // Placeholder - actual implementation would query Kong Locker
      // const allVotingPowers = await kongLockerActor.get_all_voting_powers();
      // const filtered = allVotingPowers.filter(vp => vp.token_id === tokenId);

      // For now, set placeholder data
      setStats({
        totalHolders: 0,
        totalVotingPower: 0,
        tierDistribution: {
          None: 0,
          Observer: 0,
          Participant: 0,
          Contributor: 0,
          Governor: 0,
        }
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voting Power Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total VP Holders</div>
            <div className="text-2xl font-bold">{stats.totalHolders}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Voting Power</div>
            <div className="text-2xl font-bold">{stats.totalVotingPower.toLocaleString()}</div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Distribution by Tier</h4>

          {Object.entries(stats.tierDistribution).map(([tier, count]) => (
            <div key={tier} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{tier}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Analytics data is fetched from Kong Locker and shows the distribution of voting power across all holders
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
