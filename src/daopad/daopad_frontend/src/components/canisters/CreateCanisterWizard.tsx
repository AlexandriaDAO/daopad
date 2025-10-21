import { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { getOrbitCanisterService } from '../../services/backend';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';
import { Loader2, Server, Plus, X, AlertCircle } from 'lucide-react';

export default function CreateCanisterWizard({ token, onSuccess, onClose }) {
  const [mode, setMode] = useState('import'); // 'create' or 'import'
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    labels: [],
    initial_cycles: '',
    canister_id: '', // For import mode
    permissions: {
      read: 'everyone',
      change: 'admin'
    }
  });

  const [newLabel, setNewLabel] = useState('');

  const handleAddLabel = () => {
    if (newLabel && !formData.labels.includes(newLabel)) {
      setFormData({
        ...formData,
        labels: [...formData.labels, newLabel]
      });
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (label) => {
    setFormData({
      ...formData,
      labels: formData.labels.filter(l => l !== label)
    });
  };

  const validateStep = () => {
    if (step === 1) return true; // Mode selection

    if (step === 2) {
      if (!formData.name.trim()) {
        setError('Canister name is required');
        return false;
      }

      if (mode === 'import') {
        if (!formData.canister_id.trim()) {
          setError('Canister ID is required');
          return false;
        }

        // Validate Principal format
        try {
          Principal.fromText(formData.canister_id);
        } catch (e) {
          setError('Invalid canister ID format');
          return false;
        }
      }
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      let result;

      if (mode === 'create') {
        // Create new canister
        result = await getOrbitCanisterService(null).createCanister(token.canister_id, {
          kind: {
            CreateNew: {
              initial_cycles: formData.initial_cycles ?
                BigInt(Number(formData.initial_cycles) * 1e12) : undefined,
              subnet_selection: undefined // Use default subnet
            }
          },
          name: formData.name,
          description: formData.description || undefined,
          labels: formData.labels,
          metadata: [],
          permissions: {
            read: formData.permissions.read === 'everyone' ?
              { Authenticated: null } :
              { Id: ["00000000-e400-0000-4d8f-480000000000"] }, // Admin group
            change: { Id: ["00000000-e400-0000-4d8f-480000000000"] }, // Admin group
            calls: []
          },
          request_policies: {
            change: [],
            calls: []
          },
          title: `Create new canister: ${formData.name}`,
          summary: formData.description
        });
      } else {
        // Import existing canister
        result = await getOrbitCanisterService(null).importCanister(
          token.canister_id,
          formData.canister_id,
          {
            name: formData.name,
            description: formData.description || undefined,
            labels: formData.labels,
            metadata: [],
            permissions: {
              read: { Authenticated: null },
              change: { Id: ["00000000-e400-0000-4d8f-480000000000"] }, // Admin group
              calls: []
            },
            request_policies: {
              change: [],
              calls: []
            },
            title: `Import canister: ${formData.name}`,
            summary: `Add existing canister ${formData.canister_id} to DAO control`
          }
        );
      }

      if (result.success) {
        onSuccess(result.data);
      } else {
        throw new Error(result.error || 'Failed to create request');
      }
    } catch (error) {
      console.error('Create canister error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 ${s < 3 ? 'border-b-2' : ''} ${
              s <= step ? 'border-blue-500' : 'border-gray-200'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-blue-500 text-white'
                  : s < step
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s}
            </div>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Mode Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">How would you like to add a canister?</h3>

          <RadioGroup value={mode} onValueChange={setMode}>
            <div className="space-y-3">
              <div
                className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  mode === 'import' ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => setMode('import')}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="import" id="import" />
                  <div className="flex-1">
                    <Label htmlFor="import" className="cursor-pointer">
                      <div className="font-medium">Import Existing Canister</div>
                      <p className="text-sm text-gray-500 mt-1">
                        Add a canister you already control to be managed by the DAO
                      </p>
                    </Label>
                  </div>
                </div>
              </div>

              <div
                className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  mode === 'create' ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => setMode('create')}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="create" id="create" />
                  <div className="flex-1">
                    <Label htmlFor="create" className="cursor-pointer">
                      <div className="font-medium">Create New Canister</div>
                      <p className="text-sm text-gray-500 mt-1">
                        Deploy a new canister controlled by the DAO
                      </p>
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Step 2: Basic Information */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {mode === 'create' ? 'New Canister Details' : 'Import Canister Details'}
          </h3>

          {mode === 'import' && (
            <div className="space-y-2">
              <Label htmlFor="canister_id">Canister ID *</Label>
              <Input
                id="canister_id"
                type="text"
                placeholder="e.g., ryjl3-tyaaa-aaaaa-aaaba-cai"
                value={formData.canister_id}
                onChange={(e) => setFormData({ ...formData, canister_id: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                The Principal ID of the canister to import
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Token Ledger"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the canister's purpose..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="cycles">Initial Cycles (T)</Label>
              <Input
                id="cycles"
                type="number"
                placeholder="e.g., 1.5"
                value={formData.initial_cycles}
                onChange={(e) => setFormData({ ...formData, initial_cycles: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Optional: Initial cycles to allocate (in trillion cycles)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add a label..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
              />
              <Button
                type="button"
                onClick={handleAddLabel}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.labels.map((label) => (
                  <Badge key={label} variant="secondary">
                    {label}
                    <button
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Review & Submit</h3>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-gray-500" />
              <span className="font-medium">
                {mode === 'create' ? 'Create New Canister' : 'Import Existing Canister'}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-medium">{formData.name}</span>
              </div>

              {mode === 'import' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Canister ID:</span>
                  <span className="font-mono text-xs">{formData.canister_id}</span>
                </div>
              )}

              {formData.description && (
                <div>
                  <span className="text-gray-500">Description:</span>
                  <p className="mt-1">{formData.description}</p>
                </div>
              )}

              {mode === 'create' && formData.initial_cycles && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Initial Cycles:</span>
                  <span className="font-medium">{formData.initial_cycles} T</span>
                </div>
              )}

              {formData.labels.length > 0 && (
                <div>
                  <span className="text-gray-500">Labels:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.labels.map((label) => (
                      <Badge key={label} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will create a governance request. The action will be executed once approved
              by the required number of members.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Creating Request...' : 'Create Request'}
          </Button>
        )}
      </div>
    </div>
  );
}