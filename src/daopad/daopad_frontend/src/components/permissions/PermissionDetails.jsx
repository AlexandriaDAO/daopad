import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, Users, User, Globe, Lock, Edit2, Save, X } from "lucide-react";
import { DAOPadBackendService } from '@/services/daopadBackend';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const PermissionDetails = ({ tokenId, resource, onClose, onUpdate }) => {
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const { identity } = useAuth();

  useEffect(() => {
    if (tokenId && resource && identity) {
      fetchPermissionDetails();
      fetchUserGroups();
      fetchUsers();
    }
  }, [tokenId, resource, identity]);

  const fetchPermissionDetails = async () => {
    setLoading(true);
    try {
      const service = new DAOPadBackendService(identity);
      const result = await service.getPermission(tokenId, resource);

      if (result.Ok) {
        setPermission(result.Ok.permission);
      } else {
        console.error('Failed to fetch permission:', result.Err);
        toast({
          title: "Failed to load permission",
          description: result.Err?.message || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching permission:', error);
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const service = new DAOPadBackendService(identity);
      const result = await service.listUserGroups(tokenId, null);
      if (result.Ok) {
        setUserGroups(result.Ok.user_groups || []);
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const service = new DAOPadBackendService(identity);
      const result = await service.listOrbitUsers(tokenId);
      if (result.Ok) {
        setAllUsers(result.Ok || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getResourceDisplay = (resource) => {
    const resourceType = Object.keys(resource)[0];
    const action = resource[resourceType];
    const actionName = typeof action === 'object' ? Object.keys(action)[0] : 'Unknown';
    return `${resourceType}.${actionName}`;
  };

  const getAuthScopeDisplay = (authScope) => {
    const scopeType = Object.keys(authScope)[0];
    switch (scopeType) {
      case 'Public':
        return { icon: Globe, label: 'Public Access', variant: 'success' };
      case 'Authenticated':
        return { icon: Users, label: 'Authenticated Users', variant: 'secondary' };
      case 'Restricted':
        return { icon: Lock, label: 'Restricted Access', variant: 'destructive' };
      default:
        return { icon: Shield, label: scopeType, variant: 'default' };
    }
  };

  const handleSave = async () => {
    // TODO: Implement permission update
    toast({
      title: "Coming Soon",
      description: "Permission editing will be available in the next update",
    });
    setEditing(false);
  };

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

  if (!permission) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Permission not found
          </div>
        </CardContent>
      </Card>
    );
  }

  const authScopeInfo = getAuthScopeDisplay(permission.allow.auth_scope);
  const Icon = authScopeInfo.icon;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permission Details
            </CardTitle>
            <CardDescription>
              {getResourceDisplay(permission.resource)}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  disabled
                  title="Coming soon"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Access Level */}
        <div>
          <h3 className="text-sm font-medium mb-2">Access Level</h3>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <Badge variant={authScopeInfo.variant}>
              {authScopeInfo.label}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Allowed Users */}
        <div>
          <h3 className="text-sm font-medium mb-2">
            Allowed Users ({permission.allow.users.length})
          </h3>
          {permission.allow.users.length > 0 ? (
            <div className="space-y-2">
              {permission.allow.users.map((userId) => {
                const user = allUsers.find(u => u.id === userId);
                return (
                  <div key={userId} className="flex items-center gap-2 p-2 rounded-md border">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {user?.name || userId}
                    </span>
                    {user && (
                      <Badge variant="outline" className="ml-auto">
                        {user.status}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No specific users assigned
            </p>
          )}
        </div>

        <Separator />

        {/* Allowed Groups */}
        <div>
          <h3 className="text-sm font-medium mb-2">
            Allowed Groups ({permission.allow.user_groups.length})
          </h3>
          {permission.allow.user_groups.length > 0 ? (
            <div className="space-y-2">
              {permission.allow.user_groups.map((groupId) => {
                const group = userGroups.find(g => g.id === groupId);
                return (
                  <div key={groupId} className="flex items-center gap-2 p-2 rounded-md border">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {group?.name || groupId}
                    </span>
                    {group?.name === 'Admin' && (
                      <Badge variant="destructive" className="ml-auto">
                        System
                      </Badge>
                    )}
                    {group?.name === 'Operator' && (
                      <Badge variant="secondary" className="ml-auto">
                        System
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No groups assigned
            </p>
          )}
        </div>

        {/* Permission Summary */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <h3 className="text-sm font-medium mb-2">Summary</h3>
          <p className="text-sm text-muted-foreground">
            This permission controls access to <strong>{getResourceDisplay(permission.resource)}</strong>.
            {permission.allow.auth_scope.Public && " It is publicly accessible to everyone."}
            {permission.allow.auth_scope.Authenticated && " It requires users to be authenticated."}
            {permission.allow.auth_scope.Restricted && " It is restricted to specific users and groups."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionDetails;