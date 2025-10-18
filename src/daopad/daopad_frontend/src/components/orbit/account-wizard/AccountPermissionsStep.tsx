import React from 'react';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/select';
import { Info } from 'lucide-react';

export const AccountPermissionsStep = ({
  accountConfig,
  setAccountConfig
}) => {
  const permissionOptions = [
    { value: 'Public', label: 'Everyone', description: 'Anyone can perform this action' },
    { value: 'Authenticated', label: 'Logged in users', description: 'Only authenticated users' },
    { value: 'Restricted', label: 'Admins only', description: 'Only admin and operator groups' }
  ];

  const updatePermission = (permissionType, authScope) => {
    setAccountConfig(prev => ({
      ...prev,
      [permissionType]: {
        authScope: { [authScope]: null },
        users: [],
        userGroups: []
      }
    }));
  };

  const getCurrentScope = (permission) => {
    return Object.keys(permission.authScope)[0] || 'Public';
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2 items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">About Permissions</p>
            <p className="text-sm text-blue-800 mt-1">
              Permissions control who can view and interact with this account. Start with restrictive permissions - you can always make them more open later.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="read-permission">View Account</Label>
          <p className="text-sm text-gray-500 mb-2">Who can see this account's balance and transactions?</p>
          <Select
            value={getCurrentScope(accountConfig.readPermission)}
            onValueChange={(value) => updatePermission('readPermission', value)}
          >
            <SelectTrigger id="read-permission">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {permissionOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="config-permission">Change Settings</Label>
          <p className="text-sm text-gray-500 mb-2">Who can modify account settings and permissions?</p>
          <Select
            value={getCurrentScope(accountConfig.configsPermission)}
            onValueChange={(value) => updatePermission('configsPermission', value)}
          >
            <SelectTrigger id="config-permission">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {permissionOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="transfer-permission">Transfer Funds</Label>
          <p className="text-sm text-gray-500 mb-2">Who can initiate transfers from this account?</p>
          <Select
            value={getCurrentScope(accountConfig.transferPermission)}
            onValueChange={(value) => updatePermission('transferPermission', value)}
          >
            <SelectTrigger id="transfer-permission">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {permissionOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Future enhancement: Add specific users/groups */}
      <div className="text-sm text-gray-500 mt-4">
        <p>Note: You can add specific users and groups after the account is created.</p>
      </div>
    </div>
  );
};