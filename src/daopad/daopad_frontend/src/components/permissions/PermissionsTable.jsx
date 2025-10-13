import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

export default function PermissionsTable({ stationId, actor }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('treasury');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stationId && actor) {
      loadPermissions();
    }
  }, [stationId, actor, category]);

  async function loadPermissions() {
    if (!actor || !stationId) {
      setError('Missing actor or station ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call backend to get permissions (backend acts as admin proxy)
      // Pass null instead of [] for Option<Vec<Resource>>
      const result = await actor.list_station_permissions(stationId, null);

      // Backend returns Result<Vec<Permission>, String>
      // Handle both direct array and nested response formats
      if (Array.isArray(result)) {
        setPermissions(result);
      } else if (result && Array.isArray(result[0])) {
        setPermissions(result[0]);
      } else {
        setPermissions([]);
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
      // Log full error for debugging type mismatches
      console.error('Full error details:', JSON.stringify(err));
      setError(err.message || 'Failed to load permissions');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }

  function filterPermissionsByCategory(category) {
    // Filter permissions based on resource type
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-destructive">Error: {error}</div>
          <Button onClick={loadPermissions} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="treasury">Treasury</TabsTrigger>
            <TabsTrigger value="canisters">Canisters</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="treasury" className="space-y-4">
            <PermissionCategorySection
              title="Treasury Permissions"
              permissions={filteredPermissions}
              category="treasury"
            />
          </TabsContent>

          <TabsContent value="canisters" className="space-y-4">
            <PermissionCategorySection
              title="Canister Permissions"
              permissions={filteredPermissions}
              category="canisters"
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <PermissionCategorySection
              title="User Permissions"
              permissions={filteredPermissions}
              category="users"
            />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <PermissionCategorySection
              title="System Permissions"
              permissions={filteredPermissions}
              category="system"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PermissionCategorySection({ title, permissions, category }) {
  if (permissions.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No {category} permissions found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {permissions.map((perm, index) => (
        <PermissionRow key={index} permission={perm} />
      ))}
    </div>
  );
}

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

function getResourceName(resource) {
  if (!resource) return 'Unknown';

  // Extract resource type from the first key
  const keys = Object.keys(resource);
  if (keys.length === 0) return 'Unknown';

  const resourceType = keys[0];
  const action = resource[resourceType];

  // Format: "ResourceType: Action"
  return `${resourceType}: ${formatAction(action)}`;
}

function formatAction(action) {
  if (!action) return 'Unknown';

  if (typeof action === 'string') {
    return action;
  }

  if (typeof action === 'object') {
    const keys = Object.keys(action);
    if (keys.length > 0) {
      return keys[0];
    }
  }

  return 'Unknown';
}

function getAuthScope(allow) {
  if (!allow || !allow.auth_scope) return 'Restricted';

  const scope = allow.auth_scope;
  if (typeof scope === 'string') {
    return scope;
  }

  if (typeof scope === 'object') {
    const keys = Object.keys(scope);
    if (keys.length > 0) {
      return keys[0];
    }
  }

  return 'Restricted';
}
