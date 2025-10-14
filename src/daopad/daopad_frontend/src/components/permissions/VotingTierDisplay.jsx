import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, Loader2 } from 'lucide-react';

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
        <CardTitle>Liquid Democracy Voting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold">
          {votingPower.toLocaleString()} VP
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Direct Voting Power:</strong> Your vote weight equals your locked LP value.
            <br /><br />
            This is a liquid democracy system:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>1 VP = 1 vote weight (no role thresholds)</li>
              <li>Lock LP tokens in Kong Locker to gain voting power</li>
              <li>Voting Power = USD value of locked LP × 100</li>
              <li>All votes steer the backend admin (no human roles)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-2">How It Works</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>• You lock LP tokens permanently in Kong Locker</div>
            <div>• Your VP = locked liquidity value × 100</div>
            <div>• Vote on proposals with your exact VP weight</div>
            <div>• When threshold met (e.g. 50% total VP), backend executes</div>
            <div>• Backend is the ONLY admin in Orbit Station</div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Check your voting power:
            <code className="block mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              dfx canister --network ic call eazgb-giaaa-aaaap-qqc2q-cai get_all_voting_powers
            </code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
