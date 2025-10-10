import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useStationService } from '@/hooks/useStationService';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Info, Shield, Settings, Users, Key } from 'lucide-react';

// Account setup validation schema
const accountSetupSchema = z.object({
  name: z.string()
    .min(1, 'Account name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  type: z.enum(['Main', 'Cycles', 'External'], {
    required_error: 'Please select an account type',
  }),
  assets: z.array(z.string()).min(1, 'At least one asset must be selected'),
  transfer_permission: z.enum(['Owner', 'Operators', 'Members']),
  approval_threshold: z.coerce.number().int().min(1, 'Threshold must be at least 1'),
  require_mfa: z.boolean().default(false),
});

export default function AccountSetupDialog({ open, onOpenChange, onAccountCreated }) {
  const { toast } = useToast();
  const station = useStationService();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState('basic');

  // Fetch available assets for selection
  const { data: assetsData } = useQuery({
    queryKey: ['station', 'assets-list'],
    queryFn: async () => {
      try {
        return await station.listAssets({ limit: 100 });
      } catch (err) {
        console.error('Failed to fetch assets:', err);
        return { assets: [] };
      }
    },
    enabled: open,
  });

  const availableAssets = assetsData?.assets || [];

  const form = useForm({
    resolver: zodResolver(accountSetupSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'Main',
      assets: [],
      transfer_permission: 'Owner',
      approval_threshold: 1,
      require_mfa: false,
    },
  });

  const selectedAssets = form.watch('assets');
  const accountType = form.watch('type');

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Create account request
      const accountRequest = {
        name: data.name,
        description: data.description || undefined,
        account_type: { [data.type]: null },
        assets: data.assets.map(id => ({ asset_id: id })),
        metadata: {
          transfer_permission: data.transfer_permission,
          approval_threshold: data.approval_threshold.toString(),
          require_mfa: data.require_mfa.toString(),
        },
      };

      const response = await station.createAccount(accountRequest);

      toast({
        title: 'Account Created',
        description: `Account "${data.name}" has been created successfully.`,
      });

      onAccountCreated?.();
      form.reset();
      setCurrentStep('basic');
    } catch (error) {
      console.error('Failed to create account:', error);
      toast({
        variant: 'destructive',
        title: 'Account Creation Failed',
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssetToggle = (assetId) => {
    const current = form.getValues('assets');
    const updated = current.includes(assetId)
      ? current.filter(id => id !== assetId)
      : [...current, assetId];
    form.setValue('assets', updated);
  };

  const getAccountTypeDescription = (type) => {
    const descriptions = {
      Main: 'Primary treasury account for holding and managing assets',
      Cycles: 'Specialized account for managing IC cycles and compute resources',
      External: 'Account for managing external blockchain assets',
    };
    return descriptions[type];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogDescription>
            Set up a new account for your treasury
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={currentStep} onValueChange={setCurrentStep}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">
                  <Info className="h-4 w-4 mr-2" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="assets">
                  <Key className="h-4 w-4 mr-2" />
                  Assets
                </TabsTrigger>
                <TabsTrigger value="permissions">
                  <Shield className="h-4 w-4 mr-2" />
                  Permissions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Account Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Main Treasury"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Main">Main Account</SelectItem>
                          <SelectItem value="Cycles">Cycles Account</SelectItem>
                          <SelectItem value="External">External Account</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {getAccountTypeDescription(field.value)}
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
                          placeholder="Additional notes about this account..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional description or purpose of this account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep('assets')}
                    disabled={!form.getValues('name') || !form.getValues('type')}
                  >
                    Next: Select Assets
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="assets" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="assets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Assets</FormLabel>
                      <FormDescription>
                        Choose which assets this account can hold
                      </FormDescription>
                      <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                        {availableAssets.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No assets available. Please create assets first.
                          </p>
                        ) : (
                          availableAssets.map((asset) => (
                            <div
                              key={asset.id}
                              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                                selectedAssets.includes(asset.id)
                                  ? 'bg-primary/10 border border-primary'
                                  : 'hover:bg-muted'
                              }`}
                              onClick={() => handleAssetToggle(asset.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-medium">
                                    {asset.symbol}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {asset.name} • {asset.blockchain}
                                  </div>
                                </div>
                              </div>
                              <Badge
                                variant={selectedAssets.includes(asset.id) ? 'default' : 'outline'}
                              >
                                {selectedAssets.includes(asset.id) ? 'Selected' : 'Select'}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedAssets.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Selected {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} for this account
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('basic')}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep('permissions')}
                    disabled={selectedAssets.length === 0}
                  >
                    Next: Permissions
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4">
                {/* Transfer Permission */}
                <FormField
                  control={form.control}
                  name="transfer_permission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transfer Permission</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Owner">Owner Only</SelectItem>
                          <SelectItem value="Operators">Operators & Above</SelectItem>
                          <SelectItem value="Members">All Members</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Who can initiate transfers from this account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Approval Threshold */}
                <FormField
                  control={form.control}
                  name="approval_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approval Threshold</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of approvals required for transfers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* MFA Requirement */}
                <FormField
                  control={form.control}
                  name="require_mfa"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Require Multi-Factor Authentication</FormLabel>
                        <FormDescription>
                          Require MFA for all transfers from this account
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    These permission settings can be modified later through governance proposals
                  </AlertDescription>
                </Alert>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('assets')}
                  >
                    Previous
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || currentStep !== 'permissions'}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}