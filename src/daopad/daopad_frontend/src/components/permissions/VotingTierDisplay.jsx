import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';

export default function VotingTierDisplay({ tokenId, identity }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Voting Power</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Voting power is determined by your locked LP tokens in Kong Locker.
            <br /><br />
            To check your voting power:
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li>Visit Kong Locker</li>
              <li>View your locked positions</li>
              <li>Voting Power = USD value × 100</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-2">Voting Tiers</h4>
          <div className="space-y-2 text-sm">
            <div><Badge variant="secondary">Observer</Badge> 1-99 VP: Can view proposals</div>
            <div><Badge>Participant</Badge> 100-999 VP: Can vote and create proposals</div>
            <div><Badge>Contributor</Badge> 1,000-9,999 VP: Active governance</div>
            <div><Badge>Governor</Badge> 10,000+ VP: Major stakeholder</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
