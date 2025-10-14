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
import { useToast } from '@/hooks/use-toast';
import { useStationService } from '@/hooks/useStationService';
import { Loader2, Info, AlertCircle, ArrowRight, Wallet } from 'lucide-react';
import { formatBalance, formatAddress } from '@/utils/format';

// Transfer validation schema
const transferFormSchema = z.object({
  asset_id: z.string().min(1, 'Please select an asset'),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Amount must be greater than 0'),
  to_address: z.string().min(1, 'Recipient address is required'),
  network: z.string().optional(),
  memo: z.string().max(500, 'Memo cannot exceed 500 characters').optional(),
  fee: z.string().optional(),
});

export default function TransferDialog({ open, onOpenChange, account, asset, onTransferComplete }) {
  const { toast } = useToast();
  const station = useStationService();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(null);

  const form = useForm({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      asset_id: asset?.id || '',
      amount: '',
      to_address: '',
      network: 'mainnet',
      memo: '',
      fee: '',
    },
  });

  const selectedAssetId = form.watch('asset_id');
  const amount = form.watch('amount');

  // Get available assets for the account
  const availableAssets = account?.assets || [];

  // Get selected asset details
  const selectedAsset = availableAssets.find(a => a.asset_id === selectedAssetId);

  // Update available balance when asset changes
  useEffect(() => {
    if (selectedAsset) {
      setAvailableBalance(selectedAsset.balance);
      // Estimate fee (simplified - in real app would call backend)
      setEstimatedFee(selectedAsset.symbol === 'ICP' ? '0.0001' : '0');
    }
  }, [selectedAsset]);

  // Validate amount doesn't exceed balance
  useEffect(() => {
    if (amount && availableBalance) {
      const amountNum = parseFloat(amount);
      const balanceNum = parseFloat(availableBalance);
      const feeNum = parseFloat(estimatedFee || 0);

      if (amountNum + feeNum > balanceNum) {
        form.setError('amount', {
          type: 'manual',
          message: 'Insufficient balance (including fees)',
        });
      } else {
        form.clearErrors('amount');
      }
    }
  }, [amount, availableBalance, estimatedFee, form]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Create transfer request
      const transferRequest = {
        from_account_id: account.id,
        from_asset_id: data.asset_id,
        to_address: data.to_address,
        amount: parseFloat(data.amount),
        memo: data.memo || undefined,
        network: data.network,
        fee: data.fee ? parseFloat(data.fee) : undefined,
      };

      const response = await station.createTransfer(transferRequest);

      toast.success('Transfer Request Created', {
        description: `Request #${response.request_id} has been submitted for approval.`
      });

      onTransferComplete?.();
    } catch (error) {
      console.error('Failed to create transfer:', error);
      toast.error('Transfer Failed', {
        description: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxAmount = () => {
    if (availableBalance) {
      const maxAmount = parseFloat(availableBalance) - parseFloat(estimatedFee || 0);
      form.setValue('amount', maxAmount > 0 ? maxAmount.toString() : '0');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Transfer Assets</DialogTitle>
          <DialogDescription>
            Send assets from {account?.name} to another address
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Account Info */}
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span>From: <strong>{account?.name}</strong></span>
                  <span className="text-xs text-muted-foreground">
                    {formatAddress(account?.address)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="transfer" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transfer">Transfer Details</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
              </TabsList>

              <TabsContent value="transfer" className="space-y-4 mt-4">
                {/* Asset Selection */}
                <FormField
                  control={form.control}
                  name="asset_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset to transfer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableAssets.map((asset) => (
                            <SelectItem key={asset.asset_id} value={asset.asset_id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{asset.symbol}</span>
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Balance: {formatBalance(asset.balance, asset.decimals)} {asset.symbol}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the asset you want to transfer
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recipient Address */}
                <FormField
                  control={form.control}
                  name="to_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter recipient address or Principal ID"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The destination address for the transfer
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleMaxAmount}
                          disabled={!selectedAsset}
                        >
                          Max
                        </Button>
                      </div>
                      {selectedAsset && (
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>Available: {formatBalance(availableBalance, selectedAsset.decimals)} {selectedAsset.symbol}</span>
                          {estimatedFee && (
                            <span>Est. Fee: {estimatedFee} {selectedAsset.symbol}</span>
                          )}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transfer Summary */}
                {selectedAsset && amount && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span>{formatBalance(amount, selectedAsset.decimals)} {selectedAsset.symbol}</span>
                          <ArrowRight className="h-4 w-4" />
                          <span className="text-xs truncate">{form.watch('to_address')}</span>
                        </div>
                        {estimatedFee && (
                          <div className="text-xs text-muted-foreground">
                            Network fee: ~{estimatedFee} {selectedAsset.symbol}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                {/* Network Selection */}
                <FormField
                  control={form.control}
                  name="network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mainnet">Mainnet</SelectItem>
                          <SelectItem value="testnet">Testnet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the network for this transfer
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Memo */}
                <FormField
                  control={form.control}
                  name="memo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memo (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a note for this transfer..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional message or reference for this transfer
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Fee */}
                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Fee (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder={estimatedFee || '0.0001'}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Override the default network fee (advanced users only)
                      </FormDescription>
                      <FormMessage />
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
              <Button
                type="submit"
                disabled={isSubmitting || !selectedAsset || !amount}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Transfer Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}