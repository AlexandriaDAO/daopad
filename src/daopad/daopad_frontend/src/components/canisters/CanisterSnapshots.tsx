import React, { useState, useEffect } from 'react';
import { getOrbitCanisterService } from '../../services/backend';
import { canisterCapabilities } from '../../utils/canisterCapabilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Progress } from '../ui/progress';
import {
  Camera,
  Download,
  RotateCcw,
  Trash2,
  Clock,
  Database,
  AlertTriangle,
  Info,
  CheckCircle,
  Shield
} from 'lucide-react';

export default function CanisterSnapshots({ canister, privileges, orbitStationId, onRefresh }) {
  const canManage = canisterCapabilities.canManage(privileges);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const [restoringSnapshot, setRestoringSnapshot] = useState(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const MAX_SNAPSHOTS = 10; // ICP supports up to 10 snapshots per canister (enabled via Orbit Station)

  useEffect(() => {
    fetchSnapshots();
  }, [canister.canister_id]);

  const fetchSnapshots = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getOrbitCanisterService(identity).listSnapshots(
        orbitStationId,
        canister.canister_id
      );

      if (result.Ok) {
        // Sort snapshots by creation time (newest first)
        const sorted = result.Ok.sort((a, b) =>
          Number(b.taken_at) - Number(a.taken_at)
        );
        setSnapshots(sorted);
      } else {
        setError(result.Err || 'Failed to fetch snapshots');
      }
    } catch (err) {
      console.error('Error fetching snapshots:', err);
      setError('Failed to fetch snapshots');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeSnapshot = async () => {
    if (!canManage) {
      setError('You do not have permission to take snapshots of this canister.');
      return;
    }

    if (snapshots.length >= MAX_SNAPSHOTS) {
      setError(`Maximum number of snapshots (${MAX_SNAPSHOTS}) reached. Please delete old snapshots first.`);
      return;
    }

    setTakingSnapshot(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await getOrbitCanisterService(identity).takeSnapshot(
        orbitStationId,
        canister.id
      );

      if (result.Ok) {
        setSuccess('Snapshot request created successfully');
        setTimeout(() => fetchSnapshots(), 2000);
      } else {
        setError(result.Err?.message || 'Failed to take snapshot');
      }
    } catch (err) {
      console.error('Snapshot error:', err);
      setError('Failed to create snapshot request');
    } finally {
      setTakingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshot) => {
    if (!confirm(`Are you sure you want to restore from snapshot taken on ${formatDate(snapshot.taken_at)}? This will replace the current canister state.`)) {
      return;
    }

    setRestoringSnapshot(snapshot.id);
    setError(null);
    setSuccess(null);

    try {
      const result = await getOrbitCanisterService(identity).restoreSnapshot(
        orbitStationId,
        canister.id,
        snapshot.id
      );

      if (result.Ok) {
        setSuccess('Restore request created successfully');
        setTimeout(() => onRefresh(), 2000);
      } else {
        setError(result.Err?.message || 'Failed to restore snapshot');
      }
    } catch (err) {
      console.error('Restore error:', err);
      setError('Failed to create restore request');
    } finally {
      setRestoringSnapshot(null);
    }
  };

  const handleDeleteSnapshot = async (snapshot) => {
    if (!confirm(`Delete snapshot from ${formatDate(snapshot.taken_at)}? This cannot be undone.`)) {
      return;
    }

    setDeletingSnapshot(snapshot.id);
    setError(null);
    setSuccess(null);

    try {
      const result = await getOrbitCanisterService(identity).deleteSnapshot(
        orbitStationId,
        canister.id,
        snapshot.id
      );

      if (result.Ok) {
        setSuccess('Snapshot deleted successfully');
        setTimeout(() => fetchSnapshots(), 1000);
      } else {
        setError(result.Err?.message || 'Failed to delete snapshot');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete snapshot');
    } finally {
      setDeletingSnapshot(null);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(Number(timestamp) / 1e6); // Convert from nanoseconds
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const then = Number(timestamp) / 1e6;
    const diff = now - then;

    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;

    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    const minutes = Math.floor(diff / 60000);
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

    return 'Just now';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-3">Loading snapshots...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canManage && (
        <Alert className="mb-4">
          <Shield className="h-4 w-4" />
          <AlertTitle>Read-Only Access</AlertTitle>
          <AlertDescription>
            You have read-only access to this canister. To take snapshots or restore, Orbit Station must be a controller.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Snapshot Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Snapshot Management
            </span>
            <Button
              onClick={handleTakeSnapshot}
              disabled={takingSnapshot || snapshots.length >= MAX_SNAPSHOTS || !canManage}
            >
              <Camera className="h-4 w-4 mr-2" />
              {takingSnapshot ? 'Taking Snapshot...' : 'Take Snapshot'}
            </Button>
          </CardTitle>
          <CardDescription>
            Back up and restore canister state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Storage Usage */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Snapshot Slots Used</span>
                <span className="font-medium">
                  {snapshots.length} / {MAX_SNAPSHOTS}
                </span>
              </div>
              <Progress
                value={(snapshots.length / MAX_SNAPSHOTS) * 100}
                className="h-2"
              />
            </div>

            {/* Info Alert */}
            {snapshots.length >= MAX_SNAPSHOTS && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Maximum snapshot limit reached. Delete old snapshots to take new ones.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Snapshots List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length > 0 ? (
            <div className="space-y-3">
              {snapshots.map((snapshot, idx) => (
                <div
                  key={snapshot.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          Snapshot #{snapshots.length - idx}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(snapshot.taken_at)}
                        </div>
                        <div>
                          {getTimeAgo(snapshot.taken_at)}
                        </div>
                        {snapshot.size && (
                          <div>
                            Size: {formatSize(snapshot.size)}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs font-mono text-gray-500">
                        ID: {snapshot.id}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreSnapshot(snapshot)}
                        disabled={restoringSnapshot === snapshot.id || !canManage}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {restoringSnapshot === snapshot.id ? 'Restoring...' : 'Restore'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteSnapshot(snapshot)}
                        disabled={deletingSnapshot === snapshot.id || !canManage}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No snapshots available</p>
              <p className="text-sm text-gray-400 mt-1">
                Take a snapshot to create a backup of the canister state
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snapshot Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            About Snapshots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Snapshots capture the complete canister state including memory and stable storage
            </p>
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Maximum of {MAX_SNAPSHOTS} snapshots can be stored per canister
            </p>
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Snapshots are automatically taken before major upgrades (if enabled)
            </p>
            <p className="flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 text-yellow-500 flex-shrink-0" />
              Restoring a snapshot will overwrite the current canister state
            </p>
            <p className="flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 text-yellow-500 flex-shrink-0" />
              Deleted snapshots cannot be recovered
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Automatic Snapshot Rules (Future Feature) */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Automatic Snapshots (Coming Soon)</CardTitle>
          <CardDescription>
            Configure rules for automatic snapshot creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Automatic snapshot scheduling will be available in a future update.
            This will allow you to configure regular backups based on time intervals
            or specific events.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}