import React, { useState, useEffect } from 'react';
import { getOrbitCanisterService } from '../../services/backend';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import CanisterOverview from './CanisterOverview';
import CanisterMethods from './CanisterMethods';
import CanisterUpgrades from './CanisterUpgrades';
import CanisterSnapshots from './CanisterSnapshots';
import CanisterSettings from './CanisterSettings';

export default function CanisterDetails({ orbitStationId, canisterId, onBack }) {
  const [canister, setCanister] = useState(null);
  const [privileges, setPrivileges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (canisterId) {
      fetchCanisterDetails();
    }
  }, [canisterId, orbitStationId]);

  const fetchCanisterDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch canister details from Orbit Station
      const result = await getOrbitCanisterService(null).getCanisterDetails(
        orbitStationId,
        canisterId
      );

      if (result.success) {
        setCanister(result.data);
        setPrivileges(result.privileges);
      } else {
        setError(result.error || 'Failed to load canister details');
      }
    } catch (err) {
      console.error('Error fetching canister details:', err);
      setError('Failed to load canister details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCanisterDetails();
    setRefreshing(false);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Canisters
        </Button>
      </div>
    );
  }

  if (!canister) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>Canister not found</AlertDescription>
        </Alert>
        <Button onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Canisters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{canister.name}</h2>
            <p className="text-sm text-gray-600 font-mono">
              {canister.canister_id}
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-4">
        <span className={`px-3 py-1 rounded-full text-sm ${
          (canister.state && 'Active' in canister.state) ?
            'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
        }`}>
          {(canister.state && 'Active' in canister.state) ? 'Active' : 'Archived'}
        </span>
        {canister.labels?.map(label => (
          <span key={label} className="px-2 py-1 text-xs bg-gray-100 rounded">
            {label}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CanisterOverview
            canister={canister}
            privileges={privileges}
            orbitStationId={orbitStationId}
            onRefresh={fetchCanisterDetails}
          />
        </TabsContent>

        <TabsContent value="methods">
          <CanisterMethods
            canister={canister}
            privileges={privileges}
            orbitStationId={orbitStationId}
            onRefresh={fetchCanisterDetails}
          />
        </TabsContent>

        <TabsContent value="upgrades">
          <CanisterUpgrades
            canister={canister}
            privileges={privileges}
            orbitStationId={orbitStationId}
            onRefresh={fetchCanisterDetails}
          />
        </TabsContent>

        <TabsContent value="snapshots">
          <CanisterSnapshots
            canister={canister}
            privileges={privileges}
            orbitStationId={orbitStationId}
            onRefresh={fetchCanisterDetails}
          />
        </TabsContent>

        <TabsContent value="settings">
          <CanisterSettings
            canister={canister}
            privileges={privileges}
            orbitStationId={orbitStationId}
            onRefresh={fetchCanisterDetails}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}