import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Globe, Lock, Edit } from "lucide-react";
import { DAOPadBackendService } from '@/services/daopadBackend';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const PermissionsTable = ({ tokenId, stationId }) => {
  const [permissions, setPermissions] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { identity } = useAuth();

  useEffect(() => {
    if (tokenId && identity) {
      fetchPermissions();
    }
  }, [tokenId, identity]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const service = new DAOPadBackendService(identity);
      const result = await service.listPermissions(tokenId, null);

      if (result.Ok) {
        setPermissions(result.Ok.permissions || []);
        setUserGroups(result.Ok.user_groups || []);
      } else {
        console.error('Failed to fetch permissions:', result.Err);
        toast({
          title: "Failed to load permissions",
          description: result.Err?.message || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (resource) => {
    const resourceType = Object.keys(resource)[0];
    switch (resourceType) {
      case 'Account':
        return '💰';
      case 'User':
        return '👤';
      case 'UserGroup':
        return '👥';
      case 'System':
        return '⚙️';
      case 'Permission':
        return '🔐';
      case 'Request':
        return '📝';
      case 'Asset':
        return '💎';
      case 'ExternalCanister':
        return '📦';
      default:
        return '📋';
    }
  };

  const getActionName = (resource) => {
    const resourceType = Object.keys(resource)[0];
    const action = resource[resourceType];

    if (typeof action === 'object' && action !== null) {
      return Object.keys(action)[0];
    }
    return 'Unknown';
  };

  const getAuthScopeBadge = (authScope) => {
    const scopeType = Object.keys(authScope)[0];
    switch (scopeType) {
      case 'Public':
        return <Badge variant="success"><Globe className="w-3 h-3 mr-1" />Public</Badge>;
      case 'Authenticated':
        return <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />Authenticated</Badge>;
      case 'Restricted':
        return <Badge variant="destructive"><Lock className="w-3 h-3 mr-1" />Restricted</Badge>;
      default:
        return <Badge>{scopeType}</Badge>;
    }
  };

  const filteredPermissions = permissions.filter(perm => {
    if (filter === 'all') return true;
    const scopeType = Object.keys(perm.allow.auth_scope)[0];
    return scopeType.toLowerCase() === filter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissions Management
            </CardTitle>
            <CardDescription>
              {permissions.length} permissions configured • {userGroups.length} user groups
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'public' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('public')}
            >
              Public
            </Button>
            <Button
              variant={filter === 'authenticated' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('authenticated')}
            >
              Authenticated
            </Button>
            <Button
              variant={filter === 'restricted' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('restricted')}
            >
              Restricted
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.length > 0 ? (
                filteredPermissions.map((permission, index) => {
                  const resourceType = Object.keys(permission.resource)[0];
                  const actionName = getActionName(permission.resource);

                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{getResourceIcon(permission.resource)}</span>
                          {resourceType}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{actionName}</Badge>
                      </TableCell>
                      <TableCell>
                        {getAuthScopeBadge(permission.allow.auth_scope)}
                      </TableCell>
                      <TableCell>
                        {permission.allow.users.length > 0 ? (
                          <Badge variant="secondary">
                            {permission.allow.users.length} users
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {permission.allow.user_groups.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {permission.allow.user_groups.map(groupId => {
                              const group = userGroups.find(g => g.id === groupId);
                              return (
                                <Badge key={groupId} variant="outline">
                                  {group?.name || groupId.slice(0, 8)}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          title="Permission editing coming soon"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No permissions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionsTable;