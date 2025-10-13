import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import { Info } from 'lucide-react';

const PERMISSION_OPTIONS = [
  // Treasury
  { value: 'account_list', label: 'View Accounts Page', category: 'treasury', resource: 'Account', action: 'List' },
  { value: 'account_read', label: 'Read Account Details', category: 'treasury', resource: 'Account', action: 'Read' },
  { value: 'account_create', label: 'Create Accounts', category: 'treasury', resource: 'Account', action: 'Create' },
  { value: 'account_transfer', label: 'Transfer Funds', category: 'treasury', resource: 'Account', action: 'Transfer' },

  // Canisters
  { value: 'canister_list', label: 'View Canisters Page', category: 'canisters', resource: 'ExternalCanister', action: 'List' },
  { value: 'canister_read', label: 'Read Canister Details', category: 'canisters', resource: 'ExternalCanister', action: 'Read' },
  { value: 'canister_create', label: 'Create Canisters', category: 'canisters', resource: 'ExternalCanister', action: 'Create' },
  { value: 'canister_fund', label: 'Fund Canisters', category: 'canisters', resource: 'ExternalCanister', action: 'Fund' },

  // Users
  { value: 'user_list', label: 'View Users Page', category: 'users', resource: 'User', action: 'List' },
  { value: 'user_read', label: 'Read User Details', category: 'users', resource: 'User', action: 'Read' },
  { value: 'user_create', label: 'Create Users', category: 'users', resource: 'User', action: 'Create' },

  // System
  { value: 'system_info', label: 'View System Info', category: 'system', resource: 'System', action: 'SystemInfo' },
  { value: 'system_upgrade', label: 'Upgrade Station', category: 'system', resource: 'System', action: 'Upgrade' },
];

const AUTH_SCOPES = [
  { value: 'Public', label: 'Public', description: 'Anyone can access' },
  { value: 'Authenticated', label: 'Authenticated', description: 'Any authenticated user can access' },
  { value: 'Restricted', label: 'Restricted', description: 'Only specified groups/users can access' },
];

export default function PermissionRequestHelper({ stationId, actor }) {
  const [selectedPermission, setSelectedPermission] = useState('');
  const [authScope, setAuthScope] = useState('Authenticated');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleRequestPermission() {
    if (!selectedPermission) {
      setError('Please select a permission');
      return;
    }

    if (!actor || !stationId) {
      setError('Missing actor or station ID');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const permOption = PERMISSION_OPTIONS.find(p => p.value === selectedPermission);

      if (!permOption) {
        throw new Error('Invalid permission selected');
      }

      // Build resource variant based on permission type
      // This is simplified - actual implementation would need proper candid encoding
      const resource = {
        [permOption.resource]: {
          [permOption.action]: permOption.action === 'List' ? null : { Any: null }
        }
      };

      // Create edit permission request
      const requestId = await actor.create_edit_permission_request(
        stationId,
        resource,
        [{ [authScope]: null }], // auth_scope as Option
        [], // users
        [] // user_groups
      );

      setSuccess(`Permission change request created: ${requestId}`);
      setSelectedPermission('');
    } catch (err) {
      console.error('Failed to create permission request:', err);
      setError(err.message || 'Failed to create permission request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Permission Change</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> This currently creates Orbit requests directly.
            In the future, this will create DAOPad proposals that require
            community voting before execution.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="permission">Permission</Label>
          <Select value={selectedPermission} onValueChange={setSelectedPermission}>
            <SelectTrigger id="permission">
              <SelectValue placeholder="Select permission" />
            </SelectTrigger>
            <SelectContent>
              {PERMISSION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth-scope">Access Level</Label>
          <Select value={authScope} onValueChange={setAuthScope}>
            <SelectTrigger id="auth-scope">
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              {AUTH_SCOPES.map(scope => (
                <SelectItem key={scope.value} value={scope.value}>
                  <div>
                    <div className="font-medium">{scope.label}</div>
                    <div className="text-xs text-muted-foreground">{scope.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleRequestPermission}
          disabled={submitting || !selectedPermission || !actor}
          className="w-full"
        >
          {submitting ? 'Creating Request...' : 'Create Permission Request'}
        </Button>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Current:</strong> Request created directly in Orbit (backend auto-approves)
            <br />
            <strong>Future:</strong> Request creates DAOPad proposal requiring 50% VP threshold
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
