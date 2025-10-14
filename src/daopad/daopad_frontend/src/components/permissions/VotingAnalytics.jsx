import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';

export default function VotingAnalytics({ tokenId }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Voting Power Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Voting power analytics are calculated from Kong Locker data.
            Each locked LP token contributes voting power based on its USD value.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">How Voting Power Works</h4>
            <ul className="list-disc ml-6 space-y-1 text-sm text-muted-foreground">
              <li>Lock LP tokens permanently in Kong Locker</li>
              <li>Each user gets one lock canister (blackholed, immutable)</li>
              <li>Voting power = USD value of locked LP × 100</li>
              <li>Real skin in the game: can't withdraw locked tokens</li>
            </ul>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Governance Thresholds</h4>
            <ul className="list-disc ml-6 space-y-1 text-sm text-muted-foreground">
              <li>Minimum 100 VP to create proposals</li>
              <li>Proposals pass at 50% of total voting power</li>
              <li>No time-based quorum - pure vote weight</li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              To query all voting powers:
              <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
                dfx canister --network ic call eazgb-giaaa-aaaap-qqc2q-cai get_all_voting_powers
              </code>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
