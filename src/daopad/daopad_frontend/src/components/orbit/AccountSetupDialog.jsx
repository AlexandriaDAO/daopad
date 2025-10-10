import React, { useState, useEffect, useCallback } from 'react';
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

  // Local state for assets (replacing React Query)
  const [assetsData, setAssetsData] = useState({ assets: [] });
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Fetch available assets for selection
  const fetchAssets = useCallback(async () => {
    if (!open) return;

    setIsLoadingAssets(true);

    try {
      const response = await station.listAssets({ limit: 100 });
      setAssetsData(response);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setAssetsData({ assets: [] });
    } finally {
      setIsLoadingAssets(false);
    }
  }, [station, open]);

  // Fetch assets when dialog opens
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

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
        account_type: data.type,
        assets: data.assets,
        transfer_permission: data.transfer_permission,
        approval_threshold: data.approval_threshold,
        require_mfa: data.require_mfa,
      };

      const result = await station.createAccount(accountRequest);

      if (result.success) {
        toast({
          title: 'Account Created',
          description: `Account "${data.name}" has been created successfully.`,
        });
        form.reset();
        onOpenChange(false);
        if (onAccountCreated) {
          onAccountCreated(result.data);
        }
      } else {
        throw new Error(result.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        variant: 'destructive',
        title: 'Account Creation Failed',
        description: error.message || 'Failed to create account',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogDescription>
            Set up a new treasury account with custom permissions and policies
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={currentStep} onValueChange={setCurrentStep}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">
                  <Settings className="h-4 w-4 mr-2" />
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

              {/* Basic Info */}
              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Treasury" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Primary account for treasury operations..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Main">Main Account</SelectItem>
                          <SelectItem value="Cycles">Cycles Account</SelectItem>
                          <SelectItem value="External">External Account</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type determines available features
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Assets */}
              <TabsContent value="assets" className="space-y-4">
                <FormField
                  control={form.control}
                  name="assets"
                  render={() => (
                    <FormItem>
                      <FormLabel>Supported Assets</FormLabel>
                      <FormDescription>
                        Select which assets this account can hold
                      </FormDescription>
                      {isLoadingAssets ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading assets...</span>
                        </div>
                      ) : availableAssets.length === 0 ? (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            No assets available. Please configure assets first.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {availableAssets.map((asset) => (
                            <FormField
                              key={asset.id}
                              control={form.control}
                              name="assets"
                              render={({ field }) => {
                                const isChecked = field.value?.includes(asset.id);
                                return (
                                  <FormItem
                                    key={asset.id}
                                    className="flex flex-row items-center space-x-3 space-y-0 border p-3 rounded-lg"
                                  >
                                    <FormControl>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          const values = field.value || [];
                                          if (checked) {
                                            field.onChange([...values, asset.id]);
                                          } else {
                                            field.onChange(values.filter(v => v !== asset.id));
                                          }
                                        }}
                                        className="h-4 w-4"
                                      />
                                    </FormControl>
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium leading-none">
                                        {asset.symbol}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {asset.name}
                                      </p>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Permissions */}
              <TabsContent value="permissions" className="space-y-4">
                <FormField
                  control={form.control}
                  name="transfer_permission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transfer Permission</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select permission level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Owner">Owner Only</SelectItem>
                          <SelectItem value="Operators">Operators</SelectItem>
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

                <FormField
                  control={form.control}
                  name="approval_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approval Threshold</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Number of approvals required for transfers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="require_mfa"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Require MFA
                        </FormLabel>
                        <FormDescription>
                          Require multi-factor authentication for all operations
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
              <Button type="submit" disabled={isSubmitting}>
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
