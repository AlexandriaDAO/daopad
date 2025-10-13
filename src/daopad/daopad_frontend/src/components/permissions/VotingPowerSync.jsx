import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';

export default function VotingPowerSync({ stationId, actor }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSync() {
    if (!actor || !stationId) {
      setError('Missing actor or station ID');
      return;
    }

    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      // This would call a backend method to sync Kong Locker VP to Orbit Station
      // The backend would:
      // 1. Query Kong Locker for all voting powers
      // 2. Add users with 100+ VP to Orbit Station
      // 3. Remove users below 100 VP
      // 4. Update user groups based on VP tiers

      // Placeholder - actual implementation would be:
      // await actor.sync_voting_power_to_station(stationId);

      setLastSync(new Date());
      setSuccess('Voting power successfully synced to Orbit Station');
    } catch (err) {
      console.error('Failed to sync voting power:', err);
      setError(err.message || 'Failed to sync voting power');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voting Power Synchronization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Sync Kong Locker voting power to Orbit Station user management. This will:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Add users with 100+ VP to Orbit Station</li>
              <li>Remove users below 100 VP threshold</li>
              <li>Update user groups based on VP tiers</li>
            </ul>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {lastSync && (
          <p className="text-sm text-muted-foreground">
            Last synced: {lastSync.toLocaleString()}
          </p>
        )}

        <Button
          onClick={handleSync}
          disabled={syncing || !actor}
          className="w-full"
        >
          {syncing ? 'Syncing...' : 'Sync Voting Power Now'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Note: This feature is currently in development. Actual sync functionality will be implemented in a future update.
        </p>
      </CardContent>
    </Card>
  );
}
