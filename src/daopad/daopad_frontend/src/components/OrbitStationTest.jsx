import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '../providers/AuthProvider/IIProvider.jsx';
import { createStationClient } from '../services/orbit/stationClient';
import { toSerializable } from '../utils/serialization';

const DEFAULT_STATION_ID = import.meta.env.VITE_DEFAULT_STATION_ID ?? '';

export default function OrbitStationTest() {
  const { identity } = useAuth();
  const [stationId, setStationId] = useState(DEFAULT_STATION_ID);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFetchUsers = async () => {
    if (!identity) {
      setError('Please authenticate with Internet Identity first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = createStationClient({ stationId, identity });
      const response = await client.listUsers({ paginate: { limit: 5, offset: 0 } });
      setResult(toSerializable(response));
    } catch (err) {
      console.error('listUsers failed', err);
      setError(err.message ?? 'Unknown error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-executive-darkGray border border-executive-gold/20">
      <CardHeader>
        <CardTitle className="text-executive-ivory font-serif">Orbit Station Query Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-executive-lightGray">Station Canister ID</label>
          <Input value={stationId} onChange={(e) => setStationId(e.target.value)} className="bg-executive-charcoal border-executive-gold/30 text-executive-ivory" />
        </div>
        <Button onClick={handleFetchUsers} disabled={loading} className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight">
          {loading ? 'Loading…' : 'Fetch Users'}
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {result && (
          <pre className="bg-executive-charcoal/70 text-xs text-executive-ivory rounded p-4 overflow-auto max-h-64">
{JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
