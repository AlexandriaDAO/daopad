import React, { useState, useEffect } from 'react';
import { canisterService } from '../../services/canisterService';
import { canisterCapabilities } from '../../utils/canisterCapabilities';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Activity,
  Database,
  Users,
  Hash,
  Clock,
  Zap,
  AlertCircle,
  Shield
} from 'lucide-react';

export default function CanisterOverview({ canister, privileges, orbitStationId, onRefresh }) {
  const permissionInfo = canisterCapabilities.getPermissionLevel(privileges);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCanisterStatus();
  }, [canister.canister_id]);

  const fetchCanisterStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await canisterService.getCanisterStatus(canister.canister_id);
      if (result.Ok) {
        setStatus(result.Ok);
      } else {
        // Don't set error - IC status is optional if no controller access
        console.log(`IC status unavailable for ${canister.canister_id}:`, result.Err);
      }
    } catch (err) {
      console.error(`Error fetching canister status for ${canister.canister_id}:`, err);
      // Don't set error - graceful degradation
    } finally {
      setLoading(false);
    }
  };

  const formatCycles = (cycles) => {
    if (!cycles) return '0 T';
    const trillion = Number(cycles) / 1e12;
    return `${trillion.toFixed(3)} T`;
  };

  const formatMemory = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = Number(bytes) / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      let date;

      if (typeof timestamp === 'string') {
        // RFC3339 string
        date = new Date(timestamp);
      } else if (typeof timestamp === 'bigint') {
        // Orbit returns nat64 in nanoseconds (1e9 per second)
        // Convert to milliseconds for JS Date (1e3 per second)
        // Divide bigint first to avoid precision loss, then convert to Number
        const ms = Number(timestamp / 1_000_000n); // nano to milli: divide by 1,000,000
        date = new Date(ms);
      } else if (typeof timestamp === 'number') {
        // Already a number - assume nanoseconds
        const ms = timestamp / 1e6; // nano to milli: divide by 1,000,000
        date = new Date(ms);
      } else {
        return 'Invalid date format';
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (err) {
      console.error('Failed to format date:', timestamp, err);
      return 'N/A';
    }
  };

  const getCyclesPercentage = (cycles) => {
    if (!cycles) return 0;
    const trillion = Number(cycles) / 1e12;
    // Assume 10T is a "full" amount for display purposes
    return Math.min(100, (trillion / 10) * 100);
  };

  const getCyclesColor = (cycles) => {
    const trillion = Number(cycles) / 1e12;
    if (trillion < 1) return 'bg-red-500';
    if (trillion < 5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleTopUp = async () => {
    try {
      const amount = prompt('Enter cycles to send (in T):');
      if (!amount) return;

      // Validate input
      const parsed = parseFloat(amount);
      if (isNaN(parsed)) {
        alert('Please enter a valid number');
        return;
      }
      if (parsed <= 0) {
        alert('Please enter a positive number');
        return;
      }
      if (parsed > 100) {
        // Sanity check for very large amounts
        if (!confirm(`Send ${parsed}T cycles? This is a large amount.`)) {
          return;
        }
      }

      const cycles = BigInt(Math.floor(parsed * 1e12));
      const result = await canisterService.fundCanister(
        orbitStationId,
        canister.id,
        cycles
      );

      if (result.Ok) {
        alert('Top-up request created successfully');
        onRefresh();
      } else {
        alert(`Failed to create top-up request: ${result.Err?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Top-up error:', err);
      alert('Failed to create top-up request');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Badge */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center space-x-3">
          <Shield className={`h-5 w-5 ${
            permissionInfo.color === 'green' ? 'text-green-600' :
            permissionInfo.color === 'yellow' ? 'text-yellow-600' :
            permissionInfo.color === 'blue' ? 'text-blue-600' : 'text-gray-600'
          }`} />
          <div>
            <p className="font-medium">Access Level: {permissionInfo.label}</p>
            {permissionInfo.level !== 'full' && (
              <p className="text-sm text-gray-600">
                Some operations are unavailable
              </p>
            )}
          </div>
        </div>
        <Badge
          variant={permissionInfo.color === 'green' ? 'default' : 'secondary'}
          className={`
            ${permissionInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${permissionInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
          `}
        >
          {permissionInfo.label}
        </Badge>
      </div>

      {/* Limited Access Alert */}
      {permissionInfo.level !== 'full' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limited Management</AlertTitle>
          <AlertDescription>
            This canister has {permissionInfo.label.toLowerCase()}. To enable full management
            (snapshots, upgrades, settings), add Orbit Station as a controller.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics - Only show if IC status available */}
      {status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Cycles Balance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cycles Balance
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCycles(status.cycles)}</div>
              <Progress
                value={getCyclesPercentage(status.cycles)}
                className="mt-2"
              />
              <div className="mt-2">
                <Button size="sm" onClick={handleTopUp}>
                  Top Up Cycles
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Memory Usage
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMemory(status.memory_size)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Compute allocation: {status.compute_allocation || '0'}%
              </p>
            </CardContent>
          </Card>

          {/* Module Hash */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Module Hash
              </CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-xs break-all">
                {status.module_hash?.[0] ?
                  status.module_hash[0].substring(0, 16) + '...' :
                  'No module deployed'}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Detailed metrics unavailable (requires controller access)
          </AlertDescription>
        </Alert>
      )}

      {/* Controllers - Only show if status available */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Controllers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status.controllers?.length > 0 ? (
              <div className="space-y-2">
                {status.controllers.map((controller, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <code className="text-xs">{controller}</code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No controllers found</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Canister Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Canister Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className="text-sm font-medium">
                {status?.status ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Canister ID</span>
              <code className="text-xs">{canister.canister_id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Internal ID</span>
              <code className="text-xs">{canister.id}</code>
            </div>
            {canister.description && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Description</span>
                <span className="text-sm">{canister.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created At</span>
              <span className="text-sm">{formatDate(canister.created_at)}</span>
            </div>
            {canister.modified_at && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Modified</span>
                <span className="text-sm">{formatDate(canister.modified_at)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Configuration */}
      {canister.monitoring && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Monitoring Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Strategy</span>
                <span className="text-sm font-medium">
                  {canister.monitoring.strategy || 'Not configured'}
                </span>
              </div>
              {canister.monitoring.min_cycles && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Min Cycles Threshold</span>
                  <span className="text-sm">{formatCycles(canister.monitoring.min_cycles)}</span>
                </div>
              )}
              {canister.monitoring.fund_cycles && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Top-up Amount</span>
                  <span className="text-sm">{formatCycles(canister.monitoring.fund_cycles)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Activity tracking coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}