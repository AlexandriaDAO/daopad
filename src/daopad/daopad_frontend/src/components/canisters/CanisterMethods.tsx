import React, { useState, useEffect } from 'react';
import { getOrbitCanisterService } from '../../services/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Code,
  Play,
  Search,
  Shield,
  AlertCircle,
  CheckCircle,
  Plus
} from 'lucide-react';
import MethodCallDialog from './MethodCallDialog';

export default function CanisterMethods({ canister, orbitStationId, onRefresh }) {
  const [methods, setMethods] = useState([]);
  const [filteredMethods, setFilteredMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showCallDialog, setShowCallDialog] = useState(false);

  useEffect(() => {
    // For now, we'll use hardcoded methods as fetching candid interface is complex
    // In production, this would fetch the actual Candid interface
    const mockMethods = [
      {
        name: 'get_balance',
        signature: '() -> (nat)',
        type: 'query',
        permissions: { everyone: true }
      },
      {
        name: 'transfer',
        signature: '(principal, nat) -> (Result)',
        type: 'update',
        permissions: { admin: true }
      },
      {
        name: 'get_info',
        signature: '() -> (record { name: text; version: text })',
        type: 'query',
        permissions: { everyone: true }
      },
      {
        name: 'set_config',
        signature: '(record { key: text; value: text }) -> (bool)',
        type: 'update',
        permissions: { admin: true }
      }
    ];
    setMethods(mockMethods);
    setFilteredMethods(mockMethods);
  }, [canister]);

  useEffect(() => {
    const filtered = methods.filter(method =>
      method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.signature.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMethods(filtered);
  }, [searchTerm, methods]);

  const handleMethodClick = (method) => {
    setSelectedMethod(method);
    setShowCallDialog(true);
  };

  const handleConfigureMethod = async (method) => {
    // Open configuration dialog for method permissions
    alert(`Configure permissions for ${method.name} - Coming soon!`);
  };

  const handleAddMethod = () => {
    alert('Add custom method configuration - Coming soon!');
  };

  const getMethodIcon = (type) => {
    if (type === 'query') {
      return <Search className="h-4 w-4 text-blue-500" />;
    }
    return <Play className="h-4 w-4 text-green-500" />;
  };

  const getPermissionBadge = (permissions) => {
    if (permissions.everyone) {
      return (
        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
          Public
        </span>
      );
    }
    if (permissions.admin) {
      return (
        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
          Admin
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
        Custom
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Actions */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search methods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAddMethod}>
          <Plus className="h-4 w-4 mr-2" />
          Add Method
        </Button>
      </div>

      {/* Methods Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Code className="h-5 w-5 mr-2" />
            Canister Interface
          </CardTitle>
          <CardDescription>
            Methods exposed by this canister that can be called through governance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Total Methods: <span className="font-medium">{methods.length}</span>
            </p>
            <p className="text-sm text-gray-600">
              Query Methods: <span className="font-medium">
                {methods.filter(m => m.type === 'query').length}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Update Methods: <span className="font-medium">
                {methods.filter(m => m.type === 'update').length}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Methods List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredMethods.length > 0 ? (
            <div className="space-y-2">
              {filteredMethods.map((method, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getMethodIcon(method.type)}
                        <h4 className="font-medium text-lg">{method.name}</h4>
                        {getPermissionBadge(method.permissions)}
                      </div>
                      <p className="font-mono text-sm text-gray-600 mb-2">
                        {method.signature}
                      </p>
                      {method.validation_method && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <CheckCircle className="h-3 w-3" />
                          Validation: {method.validation_method}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfigureMethod(method)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMethodClick(method)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No methods found matching your search' : 'No methods configured'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Method Permissions Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Method Permissions
          </CardTitle>
          <CardDescription>
            Configure who can call each method and set validation requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>Method-level permissions allow you to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Restrict method calls to specific user groups</li>
                <li>Set up validation methods for argument verification</li>
                <li>Configure approval policies per method</li>
                <li>Enable automatic execution for safe methods</li>
              </ul>
            </div>
            <Button variant="outline" className="w-full">
              Configure All Methods
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Method Call Dialog */}
      {showCallDialog && selectedMethod && (
        <MethodCallDialog
          method={selectedMethod}
          canister={canister}
          orbitStationId={orbitStationId}
          onClose={() => {
            setShowCallDialog(false);
            setSelectedMethod(null);
          }}
          onSuccess={() => {
            setShowCallDialog(false);
            setSelectedMethod(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}