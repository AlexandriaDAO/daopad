import React, { useState } from 'react';
import { canisterService } from '../../services/backend';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Code,
  Play,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';

export default function MethodCallDialog({
  method,
  canister,
  orbitStationId,
  onClose,
  onSuccess
}) {
  const [inputMode, setInputMode] = useState('form'); // 'form' or 'json'
  const [formData, setFormData] = useState({});
  const [jsonInput, setJsonInput] = useState('');
  const [cycles, setCycles] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Parse method signature to generate form fields
  const parseMethodSignature = (signature) => {
    // Simple parser for common Candid types
    // In production, use a proper Candid parser
    const params = [];

    if (signature.includes('principal')) {
      params.push({ name: 'principal', type: 'principal', label: 'Principal ID' });
    }
    if (signature.includes('nat')) {
      params.push({ name: 'amount', type: 'nat', label: 'Amount' });
    }
    if (signature.includes('text')) {
      params.push({ name: 'text', type: 'text', label: 'Text' });
    }
    if (signature.includes('record')) {
      // Parse record fields
      const recordMatch = signature.match(/record\s*{([^}]+)}/);
      if (recordMatch) {
        const fields = recordMatch[1].split(';').map(f => f.trim()).filter(f => f);
        fields.forEach(field => {
          const [name, type] = field.split(':').map(s => s.trim());
          params.push({ name, type, label: name });
        });
      }
    }

    return params;
  };

  const methodParams = parseMethodSignature(method.signature);

  const handleFormChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleValidate = async () => {
    try {
      if (!method.validation_method) {
        setValidationResult({ success: true, message: 'No validation method configured' });
        return;
      }

      // Call validation method
      const args = inputMode === 'json' ? JSON.parse(jsonInput) : formData;
      const result = await canisterService.validateMethodCall(
        orbitStationId,
        canister.id,
        method.validation_method,
        args
      );

      if (result.Ok) {
        setValidationResult({
          success: true,
          message: 'Validation successful',
          preview: result.Ok.preview
        });
      } else {
        setValidationResult({
          success: false,
          message: result.Err?.message || 'Validation failed'
        });
      }
    } catch (err) {
      console.error('Validation error:', err);
      setValidationResult({
        success: false,
        message: 'Validation error: ' + err.message
      });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Prepare arguments
      let args;
      if (inputMode === 'json') {
        args = jsonInput;
      } else {
        // Convert form data to proper Candid format
        args = JSON.stringify(formData);
      }

      // Prepare cycles if provided
      const attachCycles = cycles ? BigInt(parseFloat(cycles) * 1e12) : undefined;

      // Submit method call request
      const result = await canisterService.callCanisterMethod(
        orbitStationId,
        canister.id,
        method.name,
        args,
        attachCycles
      );

      if (result.Ok) {
        alert('Method call request created successfully');
        onSuccess();
      } else {
        setError(result.Err?.message || 'Failed to create method call request');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit method call: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Code className="h-5 w-5 mr-2" />
            Call Method: {method.name}
          </DialogTitle>
          <DialogDescription>
            Configure and execute a method call on {canister.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Method Signature */}
          <div className="p-3 bg-gray-100 rounded">
            <p className="font-mono text-sm">{method.signature}</p>
          </div>

          {/* Input Mode Tabs */}
          <Tabs value={inputMode} onValueChange={setInputMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Form Input</TabsTrigger>
              <TabsTrigger value="json">JSON/Candid</TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-4">
              {methodParams.length > 0 ? (
                methodParams.map((param, idx) => (
                  <div key={idx}>
                    <Label htmlFor={param.name}>
                      {param.label} ({param.type})
                    </Label>
                    <Input
                      id={param.name}
                      type={param.type === 'nat' ? 'number' : 'text'}
                      value={formData[param.name] || ''}
                      onChange={(e) => handleFormChange(param.name, e.target.value)}
                      placeholder={`Enter ${param.label}`}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No parameters required for this method
                </p>
              )}
            </TabsContent>

            <TabsContent value="json">
              <div>
                <Label htmlFor="json-input">Arguments (JSON or Candid)</Label>
                <Textarea
                  id="json-input"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"principal": "aaaaa-aa", "amount": 1000}'
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Cycles Attachment */}
          <div>
            <Label htmlFor="cycles" className="flex items-center">
              <Zap className="h-4 w-4 mr-1" />
              Attach Cycles (optional, in T)
            </Label>
            <Input
              id="cycles"
              type="number"
              value={cycles}
              onChange={(e) => setCycles(e.target.value)}
              placeholder="0"
              step="0.001"
            />
          </div>

          {/* Validation Section */}
          {method.validation_method && (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleValidate}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate Arguments
              </Button>

              {validationResult && (
                <Alert variant={validationResult.success ? 'default' : 'destructive'}>
                  <AlertDescription>
                    {validationResult.message}
                    {validationResult.preview && (
                      <div className="mt-2 p-2 bg-gray-100 rounded">
                        <p className="text-sm font-mono">{validationResult.preview}</p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Permissions Info */}
          <Alert>
            <AlertDescription>
              <strong>Permissions:</strong> This method requires{' '}
              {method.permissions.everyone ? 'no special permissions' :
               method.permissions.admin ? 'admin approval' : 'custom approval'}
              . The request will be submitted for governance approval.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Play className="h-4 w-4 mr-2" />
            {submitting ? 'Creating Request...' : 'Create Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}