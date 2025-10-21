import React, { useState } from 'react';
import { canisterService } from '../../services/backend';
import { canisterCapabilities } from '../../utils/canisterCapabilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Settings,
  Save,
  Archive,
  Trash2,
  AlertTriangle,
  Shield,
  Tag
} from 'lucide-react';

export default function CanisterSettings({ canister, privileges, orbitStationId, onRefresh }) {
  const canManage = canisterCapabilities.canManage(privileges);
  const [formData, setFormData] = useState({
    name: canister.name || '',
    description: canister.description || '',
    labels: canister.labels?.join(', ') || '',
    compute_allocation: '',
    memory_allocation: '',
    freezing_threshold: '',
    reserved_cycles_limit: '',
    wasm_memory_limit: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveMetadata = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const labels = formData.labels
        .split(',')
        .map(l => l.trim())
        .filter(l => l);

      const result = await canisterService.updateCanisterMetadata(
        orbitStationId,
        canister.id,
        {
          name: formData.name,
          description: formData.description || undefined,
          labels
        }
      );

      if (result.Ok) {
        setSuccess('Metadata update request created successfully');
        setTimeout(() => onRefresh(), 2000);
      } else {
        setError(result.Err?.message || 'Failed to update metadata');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update canister metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNativeSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const settings = {};

      if (formData.compute_allocation) {
        settings.compute_allocation = [BigInt(formData.compute_allocation)];
      }
      if (formData.memory_allocation) {
        settings.memory_allocation = [BigInt(formData.memory_allocation)];
      }
      if (formData.freezing_threshold) {
        settings.freezing_threshold = [BigInt(formData.freezing_threshold)];
      }
      if (formData.reserved_cycles_limit) {
        settings.reserved_cycles_limit = [BigInt(formData.reserved_cycles_limit)];
      }
      if (formData.wasm_memory_limit) {
        settings.wasm_memory_limit = [BigInt(formData.wasm_memory_limit)];
      }

      const result = await canisterService.updateCanisterSettings(
        orbitStationId,
        canister.id,
        settings
      );

      if (result.Ok) {
        setSuccess('Settings update request created successfully');
        setTimeout(() => onRefresh(), 2000);
      } else {
        setError(result.Err?.message || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Settings update error:', err);
      setError('Failed to update canister settings');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to ${(canister.state && 'Active' in canister.state) ? 'archive' : 'unarchive'} this canister?`)) {
      return;
    }

    try {
      const result = await canisterService.archiveCanister(
        orbitStationId,
        canister.id,
        !(canister.state && 'Active' in canister.state)
      );

      if (result.Ok) {
        setSuccess(`Canister ${(canister.state && 'Active' in canister.state) ? 'archived' : 'unarchived'} successfully`);
        setTimeout(() => onRefresh(), 2000);
      } else {
        setError(result.Err?.message || 'Failed to update canister state');
      }
    } catch (err) {
      console.error('Archive error:', err);
      setError('Failed to update canister state');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this canister? This action cannot be undone.')) {
      return;
    }

    const confirmName = prompt(`Type "${canister.name}" to confirm deletion:`);
    if (confirmName !== canister.name) {
      alert('Deletion cancelled - name did not match');
      return;
    }

    try {
      const result = await canisterService.deleteCanister(
        orbitStationId,
        canister.id
      );

      if (result.Ok) {
        setSuccess('Canister deletion request created');
        alert('Canister will be deleted after approval');
        // Navigate back after a delay
        setTimeout(() => window.history.back(), 2000);
      } else {
        setError(result.Err?.message || 'Failed to delete canister');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete canister');
    }
  };

  return (
    <div className="space-y-6">
      {!canManage && (
        <Alert className="mb-4">
          <Shield className="h-4 w-4" />
          <AlertTitle>Read-Only Mode</AlertTitle>
          <AlertDescription>
            This canister is in read-only mode. Management operations require Orbit Station to be a controller.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Basic Information
          </CardTitle>
          <CardDescription>
            {canManage ?
              'Update the canister\'s name, description, and labels' :
              'View canister information (read-only)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Canister name"
              disabled={!canManage}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Canister description"
              rows={3}
              disabled={!canManage}
            />
          </div>

          <div>
            <Label htmlFor="labels">
              <Tag className="h-4 w-4 inline mr-1" />
              Labels (comma-separated)
            </Label>
            <Input
              id="labels"
              name="labels"
              value={formData.labels}
              onChange={handleInputChange}
              placeholder="production, backend, api"
              disabled={!canManage}
            />
          </div>

          <Button onClick={handleSaveMetadata} disabled={saving || !canManage}>
            <Save className="h-4 w-4 mr-2" />
            Save Metadata
          </Button>
        </CardContent>
      </Card>

      {/* Native Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Native Canister Settings</CardTitle>
          <CardDescription>
            Configure compute and memory allocation settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="compute_allocation">
                Compute Allocation (0-100%)
              </Label>
              <Input
                id="compute_allocation"
                name="compute_allocation"
                type="number"
                min="0"
                max="100"
                value={formData.compute_allocation}
                onChange={handleInputChange}
                placeholder="0"
                disabled={!canManage}
              />
            </div>

            <div>
              <Label htmlFor="memory_allocation">
                Memory Allocation (bytes)
              </Label>
              <Input
                id="memory_allocation"
                name="memory_allocation"
                type="number"
                value={formData.memory_allocation}
                onChange={handleInputChange}
                placeholder="2147483648"
                disabled={!canManage}
              />
            </div>

            <div>
              <Label htmlFor="freezing_threshold">
                Freezing Threshold (seconds)
              </Label>
              <Input
                id="freezing_threshold"
                name="freezing_threshold"
                type="number"
                value={formData.freezing_threshold}
                onChange={handleInputChange}
                placeholder="2592000"
                disabled={!canManage}
              />
            </div>

            <div>
              <Label htmlFor="reserved_cycles_limit">
                Reserved Cycles Limit
              </Label>
              <Input
                id="reserved_cycles_limit"
                name="reserved_cycles_limit"
                type="number"
                value={formData.reserved_cycles_limit}
                onChange={handleInputChange}
                placeholder="5000000000000"
                disabled={!canManage}
              />
            </div>

            <div>
              <Label htmlFor="wasm_memory_limit">
                WASM Memory Limit (bytes)
              </Label>
              <Input
                id="wasm_memory_limit"
                name="wasm_memory_limit"
                type="number"
                value={formData.wasm_memory_limit}
                onChange={handleInputChange}
                placeholder="4294967296"
                disabled={!canManage}
              />
            </div>
          </div>

          <Button onClick={handleUpdateNativeSettings} disabled={saving || !canManage}>
            <Save className="h-4 w-4 mr-2" />
            Update Settings
          </Button>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Permissions
          </CardTitle>
          <CardDescription>
            Configure who can read and modify this canister
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Read Permission</p>
                <p className="text-sm text-gray-600">
                  {canister.permissions?.read?.everyone ? 'Everyone' : 'Admin only'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Change Permission</p>
                <p className="text-sm text-gray-600">
                  Admin group required
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Permission management coming soon...
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions - proceed with caution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 border rounded">
            <div>
              <p className="font-medium">
                {(canister.state && 'Active' in canister.state) ? 'Archive' : 'Unarchive'} Canister
              </p>
              <p className="text-sm text-gray-600">
                {(canister.state && 'Active' in canister.state) ?
                  'Hide this canister from the main list' :
                  'Make this canister active again'}
              </p>
            </div>
            <Button
              variant={(canister.state && 'Active' in canister.state) ? 'outline' : 'default'}
              onClick={handleArchive}
              disabled={!canManage}
            >
              <Archive className="h-4 w-4 mr-2" />
              {(canister.state && 'Active' in canister.state) ? 'Archive' : 'Unarchive'}
            </Button>
          </div>

          <div className="flex justify-between items-center p-4 border border-red-300 rounded bg-red-50">
            <div>
              <p className="font-medium text-red-600">Delete Canister</p>
              <p className="text-sm text-gray-600">
                Permanently remove this canister and all its data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canManage}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}