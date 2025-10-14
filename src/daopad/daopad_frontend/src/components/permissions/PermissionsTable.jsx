import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2 } from 'lucide-react';
import { Principal } from '@dfinity/principal';

// Debug flag - set to false in production
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERMISSIONS;

export default function PermissionsTable({ stationId, actor }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('treasury');
  const [error, setError] = useState(null);

  const loadPermissions = useCallback(async (cancelled = { current: false }) => {
    // Add debug logging
    if (DEBUG) {
      console.log('[PermissionsTable] Starting load...', {
        hasActor: !!actor,
        hasStationId: !!stationId,
        stationId: stationId?.toString()
      });
    }

    // Check and set error state instead of silent failure
    if (!actor) {
      if (DEBUG) console.error('[PermissionsTable] No actor - cannot load');
      if (!cancelled.current) {
        setError('Wallet not connected or backend unavailable');
        setLoading(false);
      }
      return;
    }

    if (!stationId) {
      if (DEBUG) console.error('[PermissionsTable] No stationId provided');
      if (!cancelled.current) {
        setError('No station ID - select a token first');
        setLoading(false);
      }
      return;
    }

    if (!cancelled.current) {
      setLoading(true);
      setError(null);
    }

    try {
      if (DEBUG) console.log('[PermissionsTable] Calling list_station_permissions...');

      // Convert string to Principal if needed
      const stationPrincipal = typeof stationId === 'string'
        ? Principal.fromText(stationId)
        : stationId;

      const result = await actor.list_station_permissions(stationPrincipal, []);

      if (cancelled.current) return;

      if (DEBUG) {
        console.log('[PermissionsTable] Raw result:', result);
        console.log('[PermissionsTable] Result type:', typeof result, Array.isArray(result));
      }

      if (result.Ok !== undefined) {
        if (DEBUG) console.log('[PermissionsTable] Success! Loaded', result.Ok.length, 'permissions');
        setPermissions(result.Ok);
      } else if (result.Err !== undefined) {
        if (DEBUG) console.error('[PermissionsTable] Backend error:', result.Err);
        setError(result.Err);
        setPermissions([]);
      } else if (Array.isArray(result)) {
        // Fallback for direct array response
        if (DEBUG) console.log('[PermissionsTable] Direct array result with', result.length, 'permissions');
        setPermissions(result);
      } else if (result && Array.isArray(result[0])) {
        // Fallback for nested array response
        if (DEBUG) console.log('[PermissionsTable] Nested array result with', result[0].length, 'permissions');
        setPermissions(result[0]);
      } else {
        if (DEBUG) console.error('[PermissionsTable] Unexpected result format:', result);
        setError('Unexpected response format from backend');
        setPermissions([]);
      }
    } catch (err) {
      if (cancelled.current) return;

      if (DEBUG) {
        console.error('[PermissionsTable] Exception caught:', err);
        console.error('[PermissionsTable] Error message:', err.message);
        console.error('[PermissionsTable] Error stack:', err.stack);
      }
      setError(`Failed to load: ${err.message}`);
      setPermissions([]);
    } finally {
      if (!cancelled.current) {
        setLoading(false);
        if (DEBUG) console.log('[PermissionsTable] Load complete');
      }
    }
  }, [actor, stationId]);

  useEffect(() => {
    const cancelled = { current: false };

    loadPermissions(cancelled);

    return () => {
      cancelled.current = true;
    };
  }, [loadPermissions]);

  const filterPermissionsByCategory = useCallback((categoryToFilter, perms) => {
    return perms.filter(perm => {
      const resource = perm.resource;
      if (!resource) return false;

      switch (categoryToFilter) {
        case 'treasury':
          return resource.Account || resource.Asset;
        case 'canisters':
          return resource.ExternalCanister;
        case 'users':
          return resource.User || resource.UserGroup;
        case 'system':
          return resource.System || resource.RequestPolicy || resource.Permission;
        default:
          return false;
      }
    });
  }, []);

  // Memoize filtered permissions
  const filteredPermissions = useMemo(
    () => filterPermissionsByCategory(category, permissions),
    [category, permissions, filterPermissionsByCategory]
  );

  // Memoize category counts to avoid recalculation
  const categoryCounts = useMemo(() => ({
    treasury: filterPermissionsByCategory('treasury', permissions).length,
    canisters: filterPermissionsByCategory('canisters', permissions).length,
    users: filterPermissionsByCategory('users', permissions).length,
    system: filterPermissionsByCategory('system', permissions).length,
  }), [permissions, filterPermissionsByCategory]);

  // Retry handler
  const handleRetry = useCallback(() => {
    const cancelled = { current: false };
    loadPermissions(cancelled);
  }, [loadPermissions]);

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  // Show error with retry button
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleRetry} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // Main permissions view
  return (
    <Card>
      <CardHeader>
        <CardTitle>Treasury Permissions ({permissions.length})</CardTitle>
        <CardDescription>
          Access controls for this Orbit Station treasury
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filter buttons instead of tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={category === 'treasury' ? 'default' : 'outline'}
            onClick={() => setCategory('treasury')}
            size="sm"
          >
            Treasury ({categoryCounts.treasury})
          </Button>
          <Button
            variant={category === 'canisters' ? 'default' : 'outline'}
            onClick={() => setCategory('canisters')}
            size="sm"
          >
            Canisters ({categoryCounts.canisters})
          </Button>
          <Button
            variant={category === 'users' ? 'default' : 'outline'}
            onClick={() => setCategory('users')}
            size="sm"
          >
            Users ({categoryCounts.users})
          </Button>
          <Button
            variant={category === 'system' ? 'default' : 'outline'}
            onClick={() => setCategory('system')}
            size="sm"
          >
            System ({categoryCounts.system})
          </Button>
        </div>

        {/* Permissions list */}
        {filteredPermissions.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            No {category} permissions found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPermissions.map((perm) => {
              // Create a stable key from permission data
              const resourceType = perm.resource ? Object.keys(perm.resource)[0] : 'unknown';
              const authScope = perm.allow?.auth_scope ? Object.keys(perm.allow.auth_scope)[0] : 'unknown';
              const key = `${resourceType}-${authScope}-${JSON.stringify(perm.allow?.users || [])}-${JSON.stringify(perm.allow?.user_groups || [])}`;

              return <PermissionRow key={key} permission={perm} />;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Keep PermissionRow component as-is
function PermissionRow({ permission }) {
  const resourceName = getResourceName(permission.resource);
  const authScope = getAuthScope(permission.allow);
  const groups = permission?.allow?.user_groups || [];

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex-1">
        <div className="font-medium">{resourceName}</div>
        <div className="text-sm text-muted-foreground">
          {groups.length > 0 ? `${groups.length} group(s) have access` : 'Admin only'}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={authScope === 'Public' ? 'default' : 'secondary'}>
          {authScope}
        </Badge>
        <Button variant="ghost" size="sm" disabled>
          View
        </Button>
      </div>
    </div>
  );
}

// Keep helper functions as-is
function getResourceName(resource) {
  if (!resource) return 'Unknown';
  const keys = Object.keys(resource);
  if (keys.length === 0) return 'Unknown';
  const resourceType = keys[0];
  const action = resource[resourceType];
  return `${resourceType}: ${formatAction(action)}`;
}

function formatAction(action) {
  if (!action) return 'Unknown';
  if (typeof action === 'string') return action;
  if (typeof action === 'object') {
    const keys = Object.keys(action);
    if (keys.length > 0) return keys[0];
  }
  return 'Unknown';
}

function getAuthScope(allow) {
  if (!allow || !allow.auth_scope) return 'Restricted';
  const scope = allow.auth_scope;
  if (typeof scope === 'string') return scope;
  if (typeof scope === 'object') {
    const keys = Object.keys(scope);
    if (keys.length > 0) return keys[0];
  }
  return 'Restricted';
}