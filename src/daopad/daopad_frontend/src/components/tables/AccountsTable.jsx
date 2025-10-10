import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Temporarily disabled - needs reimplementation without React Query
export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol, votingPower }) {
  return (
    <Card>
      <CardContent className="py-8">
        <Alert>
          <AlertDescription>
            Accounts table temporarily disabled during state management migration.
            This component needs to be reimplemented using Redux or direct state management.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
