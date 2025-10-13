import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useStationService } from '@/hooks/useStationService';
import { Loader2, Shield, Tag, AlertCircle } from 'lucide-react';

// Validation schema for external canister
const canisterFormSchema = z.object({
  canister_id: z.string()
    .min(1, 'Canister ID is required')
    .regex(/^[a-z0-9\-]+$/, 'Invalid canister ID format'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  labels: z.array(z.string()).default([]),
  permissions: z.object({
    allow_calls: z.boolean().default(false),
    allow_cycles: z.boolean().default(false),
    read_state: z.boolean().default(true),
  }),
  validation_method: z.enum(['None', 'DID', 'Whitelist']).default('None'),
  did_file: z.string().optional(),
  whitelisted_methods: z.array(z.string()).default([]),
});

export default function ExternalCanisterDialog({ open, onOpenChange, canister, mode, onSaved }) {
  const { toast } = useToast();
  const station = useStationService();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const form = useForm({
    resolver: zodResolver(canisterFormSchema),
    defaultValues: {
      canister_id: '',
      name: '',
      description: '',
      labels: [],
      permissions: {
        allow_calls: false,
        allow_cycles: false,
        read_state: true,
      },
      validation_method: 'None',
      did_file: '',
      whitelisted_methods: [],
    },
  });

  // Load canister data when editing or viewing
  useEffect(() => {
    if (canister && (isEditMode || isViewMode)) {
      form.reset({
        canister_id: canister.canister_id || '',
        name: canister.name || '',
        description: canister.description || '',
        labels: canister.labels || [],
        permissions: canister.permissions || {
          allow_calls: false,
          allow_cycles: false,
          read_state: true,
        },
        validation_method: canister.validation_method || 'None',
        did_file: canister.did_file || '',
        whitelisted_methods: canister.whitelisted_methods || [],
      });
    } else if (isCreateMode) {
      form.reset();
    }
  }, [canister, mode, form]);

  const selectedLabels = form.watch('labels');
  const validationMethod = form.watch('validation_method');

  const handleVerifyCanister = async () => {
    const canisterId = form.getValues('canister_id');
    if (!canisterId) {
      toast({
        variant: 'destructive',
        title: 'Invalid Canister ID',
        description: 'Please enter a valid canister ID',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Verify canister exists and get info
      const result = await station.verifyCanister({ canister_id: canisterId });
      setVerificationResult({
        success: true,
        module_hash: result.module_hash,
        controllers: result.controllers,
        status: result.status,
      });

      // Auto-fill name if empty
      if (!form.getValues('name') && result.name) {
        form.setValue('name', result.name);
      }
    } catch (error) {
      setVerificationResult({
        success: false,
        error: error.message || 'Failed to verify canister',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (isCreateMode) {
        // Register new external canister
        await station.registerExternalCanister({
          canister_id: data.canister_id,
          name: data.name,
          description: data.description || undefined,
          labels: data.labels,
          permissions: {
            Allow: Object.entries(data.permissions)
              .filter(([_, allowed]) => allowed)
              .map(([perm, _]) => perm),
          },
          validation: {
            [data.validation_method]: data.validation_method === 'DID'
              ? { did: data.did_file }
              : data.validation_method === 'Whitelist'
              ? { methods: data.whitelisted_methods }
              : null,
          },
        });
      } else if (isEditMode) {
        // Update existing canister configuration
        await station.updateExternalCanister({
          canister_id: canister.canister_id,
          name: [data.name],
          description: [data.description || ''],
          labels: [data.labels],
          permissions: [{
            Allow: Object.entries(data.permissions)
              .filter(([_, allowed]) => allowed)
              .map(([perm, _]) => perm),
          }],
        });
      }

      onSaved?.();
    } catch (error) {
      console.error('Failed to save external canister:', error);
      toast({
        variant: 'destructive',
        title: isCreateMode ? 'Registration Failed' : 'Update Failed',
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLabelToggle = (label) => {
    const current = form.getValues('labels');
    const updated = current.includes(label)
      ? current.filter(l => l !== label)
      : [...current, label];
    form.setValue('labels', updated);
  };

  const handleAddMethod = () => {
    const methods = form.getValues('whitelisted_methods');
    form.setValue('whitelisted_methods', [...methods, '']);
  };

  const handleRemoveMethod = (index) => {
    const methods = form.getValues('whitelisted_methods');
    form.setValue('whitelisted_methods', methods.filter((_, i) => i !== index));
  };

  const handleMethodChange = (index, value) => {
    const methods = form.getValues('whitelisted_methods');
    methods[index] = value;
    form.setValue('whitelisted_methods', methods);
  };

  const availableLabels = ['DeFi', 'NFT', 'DAO', 'Oracle', 'Storage', 'Gaming', 'Social', 'Infrastructure'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {isViewMode && 'Canister Details'}
            {isEditMode && 'Edit External Canister'}
            {isCreateMode && 'Register External Canister'}
          </DialogTitle>
          <DialogDescription>
            {isViewMode && 'View the configuration of this external canister'}
            {isEditMode && 'Modify the canister configuration and permissions'}
            {isCreateMode && 'Register a new external canister for integration'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Canister ID */}
                <FormField
                  control={form.control}
                  name="canister_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canister ID</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="e.g., ryjl3-tyaaa-aaaaa-aaaba-cai"
                            {...field}
                            disabled={isViewMode || isEditMode}
                            className="font-mono"
                          />
                        </FormControl>
                        {isCreateMode && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleVerifyCanister}
                            disabled={isVerifying}
                          >
                            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify
                          </Button>
                        )}
                      </div>
                      <FormDescription>
                        The Principal ID of the external canister
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Verification Result */}
                {verificationResult && (
                  <Alert variant={verificationResult.success ? 'default' : 'destructive'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {verificationResult.success ? (
                        <div className="space-y-1">
                          <p>✓ Canister verified successfully</p>
                          <p className="text-xs">Status: {verificationResult.status}</p>
                        </div>
                      ) : (
                        <p>{verificationResult.error}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., DEX Liquidity Pool"
                          {...field}
                          disabled={isViewMode}
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this canister
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this canister integration..."
                          className="resize-none"
                          {...field}
                          disabled={isViewMode}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Labels */}
                <FormField
                  control={form.control}
                  name="labels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labels</FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                        {availableLabels.map((label) => (
                          <Badge
                            key={label}
                            variant={selectedLabels.includes(label) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => !isViewMode && handleLabelToggle(label)}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {label}
                          </Badge>
                        ))}
                      </div>
                      <FormDescription>
                        Select labels to categorize this canister
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4">
                {/* Permission Switches */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="permissions.allow_calls"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Allow Calls</FormLabel>
                          <FormDescription>
                            Permit executing methods on this canister
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isViewMode}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="permissions.allow_cycles"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Allow Cycles Transfer</FormLabel>
                          <FormDescription>
                            Permit sending cycles to this canister
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isViewMode}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="permissions.read_state"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Read State</FormLabel>
                          <FormDescription>
                            Allow reading canister state and status
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isViewMode}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Permissions control what operations can be performed on this canister.
                    Changes require approval through governance.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="validation" className="space-y-4 mt-4">
                {/* Validation Method */}
                <FormField
                  control={form.control}
                  name="validation_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validation Method</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          {['None', 'DID', 'Whitelist'].map((method) => (
                            <Button
                              key={method}
                              type="button"
                              variant={field.value === method ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => field.onChange(method)}
                              disabled={isViewMode}
                            >
                              {method}
                            </Button>
                          ))}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Choose how to validate calls to this canister
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* DID File (if DID validation) */}
                {validationMethod === 'DID' && (
                  <FormField
                    control={form.control}
                    name="did_file"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Candid Interface (DID)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Paste the canister's .did file content here..."
                            className="font-mono text-xs min-h-[200px]"
                            {...field}
                            disabled={isViewMode}
                          />
                        </FormControl>
                        <FormDescription>
                          The Candid interface definition for type checking
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Whitelisted Methods (if Whitelist validation) */}
                {validationMethod === 'Whitelist' && (
                  <div className="space-y-2">
                    <FormLabel>Whitelisted Methods</FormLabel>
                    <div className="space-y-2">
                      {form.watch('whitelisted_methods').map((method, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={method}
                            onChange={(e) => handleMethodChange(index, e.target.value)}
                            placeholder="Method name"
                            className="font-mono"
                            disabled={isViewMode}
                          />
                          {!isViewMode && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMethod(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      {!isViewMode && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddMethod}
                        >
                          Add Method
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      Only these methods will be allowed to be called
                    </FormDescription>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {!isViewMode && (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCreateMode ? 'Register Canister' : 'Save Changes'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}