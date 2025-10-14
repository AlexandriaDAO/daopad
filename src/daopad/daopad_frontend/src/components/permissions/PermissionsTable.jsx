import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2 } from 'lucide-react';

export default function PermissionsTable({ stationId, actor }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('treasury');
  const [error, setError] = useState(null);

  useEffect(() => {
    // FIX: Always call loadPermissions, let it handle missing actor/stationId
    loadPermissions();
  }, [stationId, actor]);

  async function loadPermissions() {
    // ADD: Comprehensive console logging
    console.log('[PermissionsTable] Starting load...', {
      hasActor: !!actor,
      hasStationId: !!stationId,
      stationId: stationId?.toString()
    });

    // FIX: Check and set error state instead of silent failure
    if (!actor) {
      console.error('[PermissionsTable] No actor - cannot load');
      setError('Wallet not connected or backend unavailable');
      setLoading(false);
      return;
    }

    if (!stationId) {
      console.error('[PermissionsTable] No stationId provided');
      setError('No station ID - select a token first');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[PermissionsTable] Calling list_station_permissions...');

      const result = await actor.list_station_permissions(stationId, []);

      console.log('[PermissionsTable] Raw result:', result);
      console.log('[PermissionsTable] Result type:', typeof result, Array.isArray(result));

      if (result.Ok !== undefined) {
        console.log('[PermissionsTable] Success! Loaded', result.Ok.length, 'permissions');
        setPermissions(result.Ok);
      } else if (result.Err !== undefined) {
        console.error('[PermissionsTable] Backend error:', result.Err);
        setError(result.Err);
        setPermissions([]);
      } else if (Array.isArray(result)) {
        // Fallback for direct array response
        console.log('[PermissionsTable] Direct array result with', result.length, 'permissions');
        setPermissions(result);
      } else if (result && Array.isArray(result[0])) {
        // Fallback for nested array response
        console.log('[PermissionsTable] Nested array result with', result[0].length, 'permissions');
        setPermissions(result[0]);
      } else {
        console.error('[PermissionsTable] Unexpected result format:', result);
        setError('Unexpected response format from backend');
        setPermissions([]);
      }
    } catch (err) {
      console.error('[PermissionsTable] Exception caught:', err);
      console.error('[PermissionsTable] Error message:', err.message);
      console.error('[PermissionsTable] Error stack:', err.stack);
      setError(`Failed to load: ${err.message}`);
      setPermissions([]);
    } finally {
      setLoading(false);
      console.log('[PermissionsTable] Load complete');
    }
  }

  function filterPermissionsByCategory(category) {
    return permissions.filter(perm => {
      const resource = perm.resource;
      if (!resource) return false;

      switch (category) {
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
  }

  const filteredPermissions = filterPermissionsByCategory(category);
  const countByCategory = (cat) => filterPermissionsByCategory(cat).length;

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
          <Button onClick={loadPermissions} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // CHANGE: Replace internal tabs with filter buttons
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
            Treasury ({countByCategory('treasury')})
          </Button>
          <Button
            variant={category === 'canisters' ? 'default' : 'outline'}
            onClick={() => setCategory('canisters')}
            size="sm"
          >
            Canisters ({countByCategory('canisters')})
          </Button>
          <Button
            variant={category === 'users' ? 'default' : 'outline'}
            onClick={() => setCategory('users')}
            size="sm"
          >
            Users ({countByCategory('users')})
          </Button>
          <Button
            variant={category === 'system' ? 'default' : 'outline'}
            onClick={() => setCategory('system')}
            size="sm"
          >
            System ({countByCategory('system')})
          </Button>
        </div>

        {/* Permissions list */}
        {filteredPermissions.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            No {category} permissions found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPermissions.map((perm, index) => (
              <PermissionRow key={index} permission={perm} />
            ))}
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
  const groups = permission.allow.user_groups || [];

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