import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useListUsersQuery, useSystemInfoQuery, useBackendTestMutation } from '../services/orbit/stationQueries';
import { toSerializable } from '../utils/serialization';

const DEFAULT_STATION_ID = import.meta.env.VITE_DEFAULT_STATION_ID ?? '';

export default function ReactQueryDemo() {
  const [stationId, setStationId] = useState(DEFAULT_STATION_ID);
  const usersQuery = useListUsersQuery({ stationId, paginate: { offset: 0, limit: 5 } });
  const systemInfoQuery = useSystemInfoQuery({ stationId });
  const backendTest = useBackendTestMutation();

  const handleBackendTest = () => backendTest.mutate({ stationId });

  return (
    <Card className="bg-executive-darkGray border border-executive-gold/20">
      <CardHeader>
        <CardTitle className="text-executive-ivory font-serif">React Query + Backend Bridge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-executive-lightGray">Station ID</label>
            <Input value={stationId} onChange={(e) => setStationId(e.target.value)} className="bg-executive-charcoal border-executive-gold/30 text-executive-ivory" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-executive-lightGray">Actions</label>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching} className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight">
                Refresh Users
              </Button>
              <Button size="sm" variant="outline" onClick={handleBackendTest} disabled={backendTest.isLoading}>
                Backend Health
              </Button>
            </div>
          </div>
        </div>

        {usersQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>{usersQuery.error?.message ?? 'Failed to load users'}</AlertDescription>
          </Alert>
        )}

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-executive-ivory font-serif">Users</h3>
            {usersQuery.isFetching && <Badge className="bg-executive-gold/20 text-executive-goldLight">Loading…</Badge>}
          </div>
          <pre className="bg-executive-charcoal/70 text-xs text-executive-ivory rounded p-4 overflow-auto max-h-48">
{JSON.stringify(toSerializable(usersQuery.data ?? {}), null, 2)}
          </pre>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-executive-ivory font-serif">System Info</h3>
            {systemInfoQuery.isFetching && <Badge className="bg-executive-gold/20 text-executive-goldLight">Loading…</Badge>}
          </div>
          <pre className="bg-executive-charcoal/70 text-xs text-executive-ivory rounded p-4 overflow-auto max-h-48">
{JSON.stringify(toSerializable(systemInfoQuery.data ?? {}), null, 2)}
          </pre>
        </section>

        {backendTest.error && (
          <Alert variant="destructive">
            <AlertDescription>{backendTest.error.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
