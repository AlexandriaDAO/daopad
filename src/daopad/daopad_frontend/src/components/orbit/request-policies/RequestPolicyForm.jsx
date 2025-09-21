import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Users, Hash, AlertCircle } from 'lucide-react';
import { RuleBuilder } from './RuleBuilder';
import { formatPrincipalShort } from '@/utils/format';

const policySchema = z.object({
  specifier: z.enum(['AddUser', 'EditUser', 'RemoveUser', 'Transfer', 'AddAccount', 'EditAccount', 'AddAsset', 'EditAsset', 'CallExternalCanister', 'ManageSystemInfo']),
  rule: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('Quorum'),
      min_approved: z.number().min(1),
      approvers: z.array(z.string()).optional()
    }),
    z.object({
      type: z.literal('Threshold'),
      min: z.number().min(0),
      max: z.number().optional()
    }),
    z.object({
      type: z.literal('Anyone'),
    }),
    z.object({
      type: z.literal('AllowListed'),
      allowed: z.array(z.string())
    })
  ])
});

export function RequestPolicyForm({
  value,
  mode = 'create',
  onSubmit,
  onCancel,
  availableUsers = [],
  availableGroups = []
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(policySchema),
    defaultValues: value || {
      specifier: undefined,
      rule: { type: 'Quorum', min_approved: 1, approvers: [] }
    }
  });

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const handleSubmit = async (data) => {
    if (isViewMode) return;

    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Failed to submit policy:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const specifierLabels = {
    AddUser: 'Add User',
    EditUser: 'Edit User',
    RemoveUser: 'Remove User',
    Transfer: 'Transfer',
    AddAccount: 'Add Account',
    EditAccount: 'Edit Account',
    AddAsset: 'Add Asset',
    EditAsset: 'Edit Asset',
    CallExternalCanister: 'External Canister Call',
    ManageSystemInfo: 'Manage System Info'
  };

  const specifierDescriptions = {
    AddUser: 'Controls who can approve requests to add new users',
    EditUser: 'Controls who can approve requests to edit existing users',
    RemoveUser: 'Controls who can approve requests to remove users',
    Transfer: 'Controls who can approve transfer requests',
    AddAccount: 'Controls who can approve adding new accounts',
    EditAccount: 'Controls who can approve editing accounts',
    AddAsset: 'Controls who can approve adding new assets',
    EditAsset: 'Controls who can approve editing assets',
    CallExternalCanister: 'Controls who can approve external canister calls',
    ManageSystemInfo: 'Controls who can approve system configuration changes'
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Policy Specifier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Policy Type
            </CardTitle>
            <CardDescription>
              Select the operation type this policy will apply to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="specifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation Type</FormLabel>
                  <Select
                    disabled={isViewMode || isEditMode}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an operation type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(specifierLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex flex-col items-start">
                            <span>{label}</span>
                            <span className="text-xs text-muted-foreground">
                              {specifierDescriptions[value]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {field.value && specifierDescriptions[field.value]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Rule Configuration */}
        {form.watch('specifier') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Approval Rules
              </CardTitle>
              <CardDescription>
                Configure how requests of this type must be approved
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RuleBuilder
                value={form.watch('rule')}
                onChange={(rule) => form.setValue('rule', rule)}
                disabled={isViewMode}
                availableUsers={availableUsers}
                availableGroups={availableGroups}
              />
            </CardContent>
          </Card>
        )}

        {/* Policy Preview */}
        {form.watch('specifier') && form.watch('rule') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Policy Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Operation:</span>
                  <Badge variant="outline">
                    {specifierLabels[form.watch('specifier')]}
                  </Badge>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground">Rule:</span>
                  <div className="flex-1">
                    {(() => {
                      const rule = form.watch('rule');
                      switch (rule.type) {
                        case 'Quorum':
                          return (
                            <div className="space-y-1">
                              <Badge variant="secondary">Quorum</Badge>
                              <p className="text-sm">
                                Requires {rule.min_approved} approval{rule.min_approved > 1 ? 's' : ''}
                                {rule.approvers?.length > 0 && (
                                  <> from specific users/groups</>
                                )}
                              </p>
                            </div>
                          );
                        case 'Threshold':
                          return (
                            <div className="space-y-1">
                              <Badge variant="secondary">Threshold</Badge>
                              <p className="text-sm">
                                Amount between {rule.min} and {rule.max || 'unlimited'}
                              </p>
                            </div>
                          );
                        case 'Anyone':
                          return (
                            <div className="space-y-1">
                              <Badge variant="secondary">Anyone</Badge>
                              <p className="text-sm">Any authorized user can approve</p>
                            </div>
                          );
                        case 'AllowListed':
                          return (
                            <div className="space-y-1">
                              <Badge variant="secondary">Allow List</Badge>
                              <p className="text-sm">
                                Only {rule.allowed?.length || 0} specific user{rule.allowed?.length !== 1 ? 's' : ''} can approve
                              </p>
                            </div>
                          );
                        default:
                          return null;
                      }
                    })()}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This policy will apply to all future "{specifierLabels[form.watch('specifier')]}" requests.
                    Existing pending requests will not be affected.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {!isViewMode && (
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}