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
import { Shield, Users, Globe, Lock, Edit, Filter, ChevronRight } from "lucide-react";
import { DAOPadBackendService } from '@/services/daopadBackend';
import { useToast } from '@/hooks/use-toast';
import PermissionEditDialog from './PermissionEditDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PermissionsTable = ({ tokenId, stationId, identity }) => {
  const [permissions, setPermissions] = useState({});
  const [userGroups, setUserGroups] = useState([]);
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (tokenId && identity) {
      fetchPermissions();
    }
  }, [tokenId, identity]);

  const groupPermissionsByCategory = (permissions) => {
    const categories = {
      Account: [],
      System: [],
      User: [],
      UserGroup: [],
      ExternalCanister: [],
      Asset: [],
      AddressBook: [],
      Request: [],
      Permission: [],
      RequestPolicy: [],
      NamedRule: [],
      Notification: []
    };

    permissions.forEach(perm => {
      // Extract top-level resource type
      const resourceType = Object.keys(perm.resource)[0];
      if (categories[resourceType]) {
        categories[resourceType].push(perm);
      }
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });

    return categories;
  };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const service = new DAOPadBackendService(identity);
      const result = await service.listPermissions(tokenId, null);

      if (result.success) {
        // Group permissions by resource type
        const grouped = groupPermissionsByCategory(result.data.permissions || []);
        setPermissions(grouped);
        setUserGroups(result.data.user_groups || []);
        setPrivileges(result.data.privileges || []);
      } else {
        console.error('Failed to fetch permissions:', result.error);
        toast({
          title: "Failed to load permissions",
          description: result.error || "Unknown error",
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

  const getActionName = (resource) => {
    const resourceType = Object.keys(resource)[0];
    const action = resource[resourceType];

    if (typeof action === 'object' && action !== null) {
      const actionName = Object.keys(action)[0];
      // Handle nested actions with IDs
      if (actionName === 'Read' || actionName === 'Update' || actionName === 'Delete' || actionName === 'Transfer' || actionName === 'Fund' || actionName === 'Change') {
        const subAction = action[actionName];
        if (typeof subAction === 'object' && subAction !== null) {
          const subKey = Object.keys(subAction)[0];
          if (subKey === 'Any') {
            return `${actionName} Any`;
          } else if (subKey === 'Id') {
            return `${actionName} (${subAction[subKey].slice(0, 8)}...)`;
          } else if (subKey === 'Canister') {
            return `${actionName} (Canister)`;
          }
        }
      }
      return actionName;
    }
    return 'Unknown';
  };

  const getAuthScopeBadge = (authScope) => {
    const scopeType = Object.keys(authScope)[0];
    switch (scopeType) {
      case 'Public':
        return <Badge variant="success" className="gap-1"><Globe className="w-3 h-3" />Public</Badge>;
      case 'Authenticated':
        return <Badge variant="secondary" className="gap-1"><Users className="w-3 h-3" />Authenticated</Badge>;
      case 'Restricted':
        return <Badge variant="destructive" className="gap-1"><Lock className="w-3 h-3" />Restricted</Badge>;
      default:
        return <Badge>{scopeType}</Badge>;
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Account: '💰',
      System: '⚙️',
      User: '👤',
      UserGroup: '👥',
      ExternalCanister: '📦',
      Asset: '💎',
      AddressBook: '📖',
      Request: '📝',
      Permission: '🔐',
      RequestPolicy: '📜',
      NamedRule: '📏',
      Notification: '🔔'
    };
    return icons[category] || '📋';
  };

  const getTotalPermissionCount = () => {
    return Object.values(permissions).reduce((total, perms) => total + perms.length, 0);
  };

  const filterPermissions = (perms) => {
    if (scopeFilter === 'all') return perms;
    return perms.filter(perm => {
      const scopeType = Object.keys(perm.allow.auth_scope)[0].toLowerCase();
      return scopeType === scopeFilter;
    });
  };

  // Get permissions for current view
  const getCurrentPermissions = () => {
    if (selectedCategory === 'all') {
      // Return all permissions as flat list with category info
      const allPerms = [];
      Object.entries(permissions).forEach(([category, categoryPerms]) => {
        categoryPerms.forEach(perm => {
          allPerms.push({ ...perm, category });
        });
      });
      return allPerms;
    } else {
      // Return permissions for selected category
      return permissions[selectedCategory] || [];
    }
  };

  const renderPermissionsTable = () => {
    const perms = getCurrentPermissions();
    const filtered = filterPermissions(perms);
    const showCategory = selectedCategory === 'all';

    if (filtered.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          No permissions found {scopeFilter !== 'all' ? `with ${scopeFilter} access` : ''}
          {selectedCategory !== 'all' ? ` in ${selectedCategory} category` : ''}
        </div>
      );
    }

    return (
      <div className="overflow-auto max-h-[600px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showCategory && <TableHead className="w-[150px]">Category</TableHead>}
              <TableHead className="w-[200px]">Action</TableHead>
              <TableHead>Access Level</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((permission, index) => {
              const actionName = getActionName(permission.resource);

              return (
                <TableRow key={`perm-${index}`}>
                  {showCategory && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getCategoryIcon(permission.category)}</span>
                        <span className="text-sm font-medium">{permission.category}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {actionName}
                  </TableCell>
                  <TableCell>
                    {getAuthScopeBadge(permission.allow.auth_scope)}
                  </TableCell>
                  <TableCell>
                    {permission.allow.users.length > 0 ? (
                      <Badge variant="outline">
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
                            <Badge key={groupId} variant="outline" className="text-xs">
                              {group?.name || `Group ${groupId.slice(0, 6)}...`}
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
                      onClick={() => {
                        setSelectedPermission(permission);
                        setEditDialogOpen(true);
                      }}
                      title="Edit permission"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
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

  const categories = Object.keys(permissions);

  return (
    <>
    <div className="flex gap-6">
      {/* Sidebar with category selection */}
      <div className="w-64 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              <Button
                variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedCategory('all')}
              >
                <span className="mr-2">📋</span>
                All Permissions
                <Badge variant="outline" className="ml-auto">
                  {getTotalPermissionCount()}
                </Badge>
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(category)}
                >
                  <span className="mr-2">{getCategoryIcon(category)}</span>
                  {category}
                  <Badge variant="outline" className="ml-auto">
                    {permissions[category].length}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scope Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter by Scope
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="authenticated">Authenticated</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Main content area */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {selectedCategory === 'all' ? 'All Permissions' : `${selectedCategory} Permissions`}
              </CardTitle>
              <CardDescription>
                {(() => {
                  const perms = getCurrentPermissions();
                  const filtered = filterPermissions(perms);
                  return `Showing ${filtered.length} of ${perms.length} permissions • ${userGroups.length} user groups`;
                })()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderPermissionsTable()}
        </CardContent>
      </Card>
    </div>

    {/* Permission Edit Dialog */}
    <PermissionEditDialog
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      permission={selectedPermission}
      userGroups={userGroups}
      tokenId={tokenId}
      identity={identity}
      onSuccess={() => {
        // Refresh permissions after successful change
        fetchPermissions();
      }}
    />
    </>
  );
};

export default PermissionsTable;