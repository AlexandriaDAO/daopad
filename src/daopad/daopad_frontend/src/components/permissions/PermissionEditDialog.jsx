import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Lock, Users, AlertCircle, Shield } from "lucide-react";
import { DAOPadBackendService } from '@/services/daopadBackend';
import { useToast } from '@/hooks/use-toast';

const PermissionEditDialog = ({
  open,
  onOpenChange,
  permission,
  userGroups,
  tokenId,
  identity,
  onSuccess
}) => {
  const [authScope, setAuthScope] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (permission && open) {
      // Set current permission settings
      setAuthScope(permission.allow?.auth_scope || 'Restricted');
      setSelectedUsers(permission.allow?.users || []);
      setSelectedGroups(permission.allow?.user_groups || []);
    }
  }, [permission, open]);

  const getResourceDisplay = (resource) => {
    if (!resource) return 'Unknown Resource';

    const resourceType = Object.keys(resource)[0];
    const action = resource[resourceType];

    if (typeof action === 'object' && action !== null) {
      const actionType = Object.keys(action)[0];
      return `${resourceType}: ${actionType}`;
    }

    return resourceType;
  };

  const getResourceDescription = (resource) => {
    const descriptions = {
      'Account': {
        'List': 'View all treasury accounts',
        'Read': 'Read specific account details',
        'Create': 'Create new treasury accounts',
        'Transfer': 'Transfer funds from accounts',
        'Update': 'Update account settings'
      },
      'System': {
        'SystemInfo': 'View system information',
        'Capabilities': 'View system capabilities',
        'ManageSystemInfo': 'Modify system settings',
        'Upgrade': 'Upgrade the station canister'
      },
      'User': {
        'List': 'View all users',
        'Read': 'Read user details',
        'Create': 'Create new users',
        'Update': 'Update user information'
      },
      'UserGroup': {
        'List': 'View all user groups',
        'Read': 'Read group details',
        'Create': 'Create new groups',
        'Update': 'Update group settings'
      },
      'ExternalCanister': {
        'List': 'View all external canisters',
        'Read': 'Read canister details',
        'Create': 'Add new canisters',
        'Call': 'Call canister methods',
        'Fund': 'Fund canisters with cycles',
        'Change': 'Modify canister settings'
      },
      'Permission': {
        'Read': 'View permission settings',
        'Update': 'Modify permission settings'
      },
      'Request': {
        'List': 'View all requests',
        'Read': 'View request details'
      }
    };

    if (!resource) return '';

    const resourceType = Object.keys(resource)[0];
    const action = resource[resourceType];

    if (typeof action === 'object' && action !== null) {
      const actionType = Object.keys(action)[0];
      return descriptions[resourceType]?.[actionType] || 'Manage this resource';
    }

    return 'Manage this resource';
  };

  const handleSubmit = async () => {
    if (!permission || !identity || !tokenId) return;

    setLoading(true);
    try {
      const service = new DAOPadBackendService(identity);

      // Map auth scope to Orbit format
      const authScopeValue = authScope === 'Public' ? { Public: null } :
                           authScope === 'Authenticated' ? { Authenticated: null } :
                           { Restricted: null };

      const result = await service.requestPermissionChange(
        tokenId,
        permission.resource,
        authScopeValue,
        selectedUsers.length > 0 ? selectedUsers : null,
        selectedGroups.length > 0 ? selectedGroups : null
      );

      if (result.success) {
        toast({
          title: "Permission change requested",
          description: `Request ID: ${result.requestId}. It will be processed after approval.`,
        });

        if (onSuccess) {
          onSuccess();
        }

        onOpenChange(false);
      } else {
        toast({
          title: "Failed to request permission change",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting permission change:', error);
      toast({
        title: "Error",
        description: "Failed to request permission change",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getScopeIcon = (scope) => {
    switch (scope) {
      case 'Public':
        return <Globe className="w-4 h-4" />;
      case 'Authenticated':
        return <Users className="w-4 h-4" />;
      case 'Restricted':
        return <Lock className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  if (!permission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Permission</DialogTitle>
          <DialogDescription>
            Modify access control for this resource. Changes require approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resource Information */}
          <div className="space-y-2">
            <Label>Resource</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{getResourceDisplay(permission.resource)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {getResourceDescription(permission.resource)}
              </div>
            </div>
          </div>

          {/* Auth Scope Selector */}
          <div className="space-y-2">
            <Label htmlFor="auth-scope">Access Level</Label>
            <Select value={authScope} onValueChange={setAuthScope}>
              <SelectTrigger id="auth-scope">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Public">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Public</span>
                  </div>
                </SelectItem>
                <SelectItem value="Authenticated">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Authenticated</span>
                  </div>
                </SelectItem>
                <SelectItem value="Restricted">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Restricted</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {authScope === 'Public' && 'Anyone can access this resource'}
              {authScope === 'Authenticated' && 'Any authenticated user can access this resource'}
              {authScope === 'Restricted' && 'Only specific users and groups can access this resource'}
            </div>
          </div>

          {/* User Groups Selection */}
          {authScope !== 'Public' && userGroups.length > 0 && (
            <div className="space-y-2">
              <Label>User Groups</Label>
              <div className="h-[120px] w-full rounded-md border p-4 overflow-y-auto">
                <div className="space-y-2">
                  {userGroups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <label
                        htmlFor={`group-${group.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {group.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Note about users */}
          {authScope === 'Restricted' && (
            <div className="text-sm text-muted-foreground italic">
              Note: Individual user selection will be available in a future update.
              Use user groups to manage access for now.
            </div>
          )}

          {/* Warning for sensitive permissions */}
          {getResourceDisplay(permission.resource).includes('System') && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is a sensitive permission that affects system security.
                Ensure you understand the implications before making changes.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Requesting..." : "Request Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionEditDialog;