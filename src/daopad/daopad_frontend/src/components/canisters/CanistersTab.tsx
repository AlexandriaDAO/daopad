import React, { useState, useEffect } from 'react';
import { getOrbitCanisterService } from '../../services/backend';
import CanisterCard from './CanisterCard';
import CanisterFilters from './CanisterFilters';
import CreateCanisterWizard from './CreateCanisterWizard';
import CanisterDetails from './CanisterDetails';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Loader2, Plus, Server } from 'lucide-react';

export default function CanistersTab({ token, stationId }) {
  // Filter out backend canister from management UI
  const BACKEND_CANISTER = 'lwsav-iiaaa-aaaap-qp2qq-cai';

  const [canisters, setCanisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedCanisterId, setSelectedCanisterId] = useState(null);
  const [filters, setFilters] = useState({
    paginate: { offset: 0, limit: 20 },  // Use regular numbers, convert to BigInt in service
    canister_ids: null,
    labels: null,
    states: null,
    sort_by: null
  });

  useEffect(() => {
    if (token?.canister_id) {
      fetchCanisters();
    }
  }, [token?.canister_id, filters]);

  const fetchCanisters = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('=== FETCHING CANISTERS ===');
      console.log('Token canister ID:', token.canister_id);
      console.log('Filters:', JSON.stringify(filters, null, 2));

      const result = await getOrbitCanisterService(null).listCanisters(
        token.canister_id,
        filters
      );

      console.log('=== LIST CANISTERS RESULT ===');
      console.log('Success:', result.success);
      if (result.success) {
        console.log('Total canisters:', result.total);
        console.log('Raw canisters:', result.data);
        console.log('Privileges:', result.privileges);

        // Filter out backend canister from display
        const filteredCanisters = (result.data || []).filter(
          c => c.canister_id !== BACKEND_CANISTER
        );
        setCanisters(filteredCanisters);
      } else {
        console.error('Error:', result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('Failed to fetch canisters:', err);
      setError('Failed to load canisters');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (request) => {
    setShowCreateWizard(false);
    fetchCanisters();
    // TODO: Show success notification with request ID
  };

  const handleTopUp = async (canisterId) => {
    // TODO: Implement top-up dialog
    console.log('Top up canister:', canisterId);
  };

  const handleConfigure = (canisterId) => {
    // Show canister details view
    setSelectedCanisterId(canisterId);
  };

  // Show detail view if a canister is selected
  if (selectedCanisterId) {
    return (
      <CanisterDetails
        orbitStationId={token?.canister_id}
        canisterId={selectedCanisterId}
        onBack={() => setSelectedCanisterId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Server className="h-6 w-6" />
            External Canisters
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage canisters controlled by this DAO
          </p>
        </div>
        <Button
          onClick={() => setShowCreateWizard(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Canister
        </Button>
      </div>

      {/* Filters */}
      <CanisterFilters
        onFiltersChange={setFilters}
        initialFilters={filters}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Canisters Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : canisters.length === 0 ? (
        <div className="text-center py-12">
          <Server className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            No canisters yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Add your first canister to start managing it through the DAO
          </p>
          <Button
            onClick={() => setShowCreateWizard(true)}
            className="mt-4"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Canister
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {canisters.map(canister => (
            <CanisterCard
              key={canister.id}
              canister={canister}
              onTopUp={() => handleTopUp(canister.canister_id)}
              onConfigure={() => handleConfigure(canister.canister_id)}
            />
          ))}
        </div>
      )}

      {/* Create Canister Wizard */}
      <Sheet open={showCreateWizard} onOpenChange={setShowCreateWizard}>
        <SheetContent className="sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Add Canister</SheetTitle>
          </SheetHeader>
          <CreateCanisterWizard
            token={token}
            onSuccess={handleCreateSuccess}
            onClose={() => setShowCreateWizard(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}