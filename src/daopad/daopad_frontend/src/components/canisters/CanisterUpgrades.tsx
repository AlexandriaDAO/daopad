import React, { useState, useEffect } from 'react';
import { canisterService } from '../../services/backend';
import { canisterCapabilities } from '../../utils/canisterCapabilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Upload,
  FileCode,
  RefreshCw,
  Shield,
  AlertTriangle,
  History,
  Package,
  CheckCircle,
  X
} from 'lucide-react';

export default function CanisterUpgrades({ canister, privileges, orbitStationId, onRefresh }) {
  const canManage = canisterCapabilities.canManage(privileges);
  const [wasmFile, setWasmFile] = useState(null);
  const [wasmModule, setWasmModule] = useState(null);
  const [upgradeMode, setUpgradeMode] = useState('upgrade');
  const [initArgs, setInitArgs] = useState('');
  const [takeSnapshot, setTakeSnapshot] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deployHistory, setDeployHistory] = useState([]);

  useEffect(() => {
    // Load deployment history (mock data for now)
    const mockHistory = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        version: '1.0.2',
        moduleHash: 'abc123...',
        deployedBy: 'Admin',
        status: 'success'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        version: '1.0.1',
        moduleHash: 'def456...',
        deployedBy: 'Admin',
        status: 'success'
      }
    ];
    setDeployHistory(mockHistory);
  }, [canister]);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.wasm')) {
      setError('Please select a valid WASM file');
      return;
    }

    setWasmFile(file);
    setError(null);

    // Read file as ArrayBuffer
    const reader = new FileReader();
    reader.onload = (e) => {
      setWasmModule(new Uint8Array(e.target.result));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpgrade = async () => {
    if (!canManage) {
      setError('You do not have permission to upgrade this canister.');
      return;
    }

    if (!wasmModule) {
      setError('Please select a WASM file first');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Take snapshot if requested
      if (takeSnapshot) {
        const snapshotResult = await canisterService.takeSnapshot(
          orbitStationId,
          canister.id
        );
        if (!snapshotResult.Ok) {
          console.warn('Snapshot failed:', snapshotResult.Err);
          if (!confirm('Snapshot failed. Continue with upgrade anyway?')) {
            setSubmitting(false);
            return;
          }
        }
      }

      // Submit upgrade request
      const result = await canisterService.upgradeCanister(
        orbitStationId,
        canister.id,
        wasmModule,
        {
          mode: upgradeMode,
          arg: initArgs || undefined
        }
      );

      if (result.Ok) {
        setSuccess('Upgrade request created successfully');
        // Reset form
        setWasmFile(null);
        setWasmModule(null);
        setInitArgs('');
        setTimeout(() => onRefresh(), 2000);
      } else {
        setError(result.Err?.message || 'Failed to create upgrade request');
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setError('Failed to submit upgrade request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRollback = async (historyItem) => {
    if (!confirm(`Rollback to version ${historyItem.version}?`)) {
      return;
    }

    try {
      const result = await canisterService.rollbackCanister(
        orbitStationId,
        canister.id,
        historyItem.moduleHash
      );

      if (result.Ok) {
        alert('Rollback request created successfully');
        onRefresh();
      } else {
        alert(`Rollback failed: ${result.Err?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Rollback error:', err);
      alert('Failed to create rollback request');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      {!canManage && (
        <Alert className="mb-4">
          <Shield className="h-4 w-4" />
          <AlertTitle>Read-Only Access</AlertTitle>
          <AlertDescription>
            You have read-only access to this canister. To upgrade code, Orbit Station must be a controller.
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
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Deploy New Code
          </CardTitle>
          <CardDescription>
            Upload a new WASM module to upgrade the canister
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="wasm-file">WASM Module</Label>
            <div className="mt-2">
              <Input
                id="wasm-file"
                type="file"
                accept=".wasm"
                onChange={handleFileSelect}
                disabled={uploading || submitting || !canManage}
              />
              {wasmFile && (
                <div className="mt-2 p-3 bg-gray-50 rounded flex items-center justify-between">
                  <div className="flex items-center">
                    <FileCode className="h-4 w-4 mr-2 text-gray-600" />
                    <span className="text-sm">{wasmFile.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({formatFileSize(wasmFile.size)})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setWasmFile(null);
                      setWasmModule(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Upgrade Mode */}
          <div>
            <Label>Upgrade Mode</Label>
            <RadioGroup value={upgradeMode} onValueChange={setUpgradeMode} disabled={!canManage}>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="upgrade" id="upgrade" disabled={!canManage} />
                <Label htmlFor="upgrade">
                  Upgrade (preserves state)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reinstall" id="reinstall" disabled={!canManage} />
                <Label htmlFor="reinstall">
                  Reinstall (clears state)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="install" id="install" disabled={!canManage} />
                <Label htmlFor="install">
                  Install (initial deployment)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Init Arguments */}
          <div>
            <Label htmlFor="init-args">
              Initialization Arguments (optional)
            </Label>
            <Textarea
              id="init-args"
              value={initArgs}
              onChange={(e) => setInitArgs(e.target.value)}
              placeholder="Candid-encoded arguments"
              rows={3}
              className="font-mono text-sm mt-2"
              disabled={!canManage}
            />
          </div>

          {/* Safety Options */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="take-snapshot"
              checked={takeSnapshot}
              onChange={(e) => setTakeSnapshot(e.target.checked)}
              disabled={!canManage}
            />
            <Label htmlFor="take-snapshot" className="flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              Take snapshot before upgrade (recommended)
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleUpgrade}
            disabled={!wasmModule || submitting || !canManage}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {submitting ? 'Creating Upgrade Request...' : 'Create Upgrade Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Version Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Current Version
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Module Hash</span>
              <span className="font-mono text-xs">
                {canister.module_hash || 'No module deployed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Updated</span>
              <span className="text-sm">
                {canister.modified_at ?
                  new Date(Number(canister.modified_at) / 1e6).toLocaleString() :
                  'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Deployment History
          </CardTitle>
          <CardDescription>
            Previous deployments and rollback options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deployHistory.length > 0 ? (
            <div className="space-y-2">
              {deployHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Version {item.version}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        Hash: {item.moduleHash}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRollback(item)}
                      disabled={!canManage}
                    >
                      Rollback
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No deployment history available</p>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Safety */}
      <Card>
        <CardHeader>
          <CardTitle>Upgrade Safety Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Always take a snapshot before upgrading
            </p>
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Test upgrades on a development canister first
            </p>
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Verify module hash after deployment
            </p>
            <p className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              Keep deployment history for rollback capability
            </p>
            <p className="flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 text-yellow-500 flex-shrink-0" />
              Reinstall mode will delete all canister data
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}