import React, { useState, useEffect } from 'react';
import { canisterService } from '../../services/canisterService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Shield,
  Users,
  Lock,
  Unlock,
  Save,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Play
} from 'lucide-react';

export default function PermissionsMatrix({ canister, orbitStationId, onRefresh }) {
  const [permissions, setPermissions] = useState({
    read: canister.permissions?.read || { everyone: null },
    change: canister.permissions?.change || { id: "00000000-e400-0000-4d8f-480000000000" },
    calls: canister.permissions?.calls || []
  });
  const [requestPolicies, setRequestPolicies] = useState({
    change: canister.request_policies?.change || [],
    calls: canister.request_policies?.calls || []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Predefined groups (in production, fetch from Orbit)
  const groups = [
    { id: "00000000-e400-0000-4d8f-480000000000", name: "Admin" },
    { id: "00000000-e400-0000-4d8f-480000000001", name: "Operator" },
    { id: "00000000-e400-0000-4d8f-480000000002", name: "Member" }
  ];

  const handleReadPermissionChange = (value) => {
    setPermissions(prev => ({
      ...prev,
      read: value === 'everyone' ? { everyone: null } : { id: value }
    }));
  };

  const handleChangePermissionChange = (value) => {
    setPermissions(prev => ({
      ...prev,
      change: { id: value }
    }));
  };

  const handleMethodPermissionChange = (method, permission) => {
    setPermissions(prev => {
      const newCalls = [...prev.calls];
      const existingIndex = newCalls.findIndex(c => c.method === method);

      if (existingIndex >= 0) {
        newCalls[existingIndex] = { method, permission };
      } else {
        newCalls.push({ method, permission });
      }

      return { ...prev, calls: newCalls };
    });
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await canisterService.configurePermissions(
        orbitStationId,
        canister.id,
        permissions
      );

      if (result.success) {
        setSuccess('Permissions update request created successfully');
        setTimeout(() => onRefresh(), 2000);
      } else {
        setError(result.error || 'Failed to update permissions');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Mock methods for demonstration (in production, fetch from canister interface)
  const methods = [
    { name: 'get_balance', type: 'query' },
    { name: 'transfer', type: 'update' },
    { name: 'get_info', type: 'query' },
    { name: 'set_config', type: 'update' }
  ];

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Canister-Level Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Canister Permissions
          </CardTitle>
          <CardDescription>
            Control who can read and modify this canister
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Read Permission */}
          <div>
            <Label className="text-base font-medium mb-3 flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Read Permission
            </Label>
            <RadioGroup
              value={permissions.read.everyone ? 'everyone' : permissions.read.id}
              onValueChange={handleReadPermissionChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="everyone" id="read-everyone" />
                <Label htmlFor="read-everyone">
                  Everyone (Public)
                </Label>
              </div>
              {groups.map(group => (
                <div key={group.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={group.id} id={`read-${group.id}`} />
                  <Label htmlFor={`read-${group.id}`}>
                    {group.name} Group Only
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Change Permission */}
          <div>
            <Label className="text-base font-medium mb-3 flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Change Permission
            </Label>
            <RadioGroup
              value={permissions.change.id}
              onValueChange={handleChangePermissionChange}
            >
              {groups.map(group => (
                <div key={group.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={group.id} id={`change-${group.id}`} />
                  <Label htmlFor={`change-${group.id}`}>
                    {group.name} Group
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Method-Level Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Play className="h-5 w-5 mr-2" />
            Method Permissions
          </CardTitle>
          <CardDescription>
            Configure permissions for individual canister methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {methods.map(method => {
              const currentPermission = permissions.calls.find(c => c.method === method.name);
              return (
                <div key={method.name} className="border rounded p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-gray-600">
                        Type: {method.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        className="p-2 border rounded"
                        value={currentPermission?.permission?.id || 'default'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'default') {
                            // Remove custom permission
                            setPermissions(prev => ({
                              ...prev,
                              calls: prev.calls.filter(c => c.method !== method.name)
                            }));
                          } else if (value === 'everyone') {
                            handleMethodPermissionChange(method.name, { everyone: null });
                          } else {
                            handleMethodPermissionChange(method.name, { id: value });
                          }
                        }}
                      >
                        <option value="default">Use canister default</option>
                        <option value="everyone">Everyone</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name} Group
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Request Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Request Policies
          </CardTitle>
          <CardDescription>
            Define approval requirements for different operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Request policies allow you to set approval thresholds, time delays,
                and conditional rules for operations. This feature is coming soon.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">Available Policy Types</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Threshold:</strong> Require N approvals</li>
                <li>• <strong>Quorum:</strong> Require percentage of members</li>
                <li>• <strong>Time Delay:</strong> Wait period before execution</li>
                <li>• <strong>Conditional:</strong> Based on operation parameters</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSavePermissions}
          disabled={saving}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Creating Request...' : 'Save Permissions'}
        </Button>
      </div>

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Permission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Read Access:</span>
              <span className="font-medium">
                {permissions.read.everyone ? 'Everyone' :
                 groups.find(g => g.id === permissions.read.id)?.name || 'Custom Group'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Change Access:</span>
              <span className="font-medium">
                {groups.find(g => g.id === permissions.change.id)?.name || 'Custom Group'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Custom Method Permissions:</span>
              <span className="font-medium">{permissions.calls.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Request Policies:</span>
              <span className="font-medium">
                {requestPolicies.change.length + requestPolicies.calls.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Restrict write access to admin group only
            </p>
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Use validation methods for critical operations
            </p>
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Implement time delays for destructive operations
            </p>
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Require multiple approvals for sensitive methods
            </p>
            <p className="flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 text-yellow-500 flex-shrink-0" />
              Public read access may expose sensitive data
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}