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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOrbitAccountsService } from '@/services';
import { Principal } from '@dfinity/principal';
import AddressInput from '@/components/inputs/AddressInput';
import { validateAddress, BlockchainType } from '@/utils/addressValidation';
import { bigintToFloat } from '@/utils/format';
import { safeStringify, debugLog } from '@/utils/logging';
import { validateUUIDs } from '@/utils/validation';

// Constants
const MIN_VOTING_POWER_FOR_PROPOSALS = 10000;

// Validation schema with improved address validation
// Validation schema will be created with maxAmount context
const createTransferSchema = (maxAmount) => z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(500, 'Description cannot exceed 500 characters'),
  to_address: z.string()
    .min(1, 'Address is required')
    .refine(
      (val) => validateAddress(BlockchainType.InternetComputer, val) === true,
      'Invalid address format'
    ),
  amount: z.string()
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Amount must be greater than 0')
    .refine(val => parseFloat(val) <= parseFloat(maxAmount),
      `Amount cannot exceed ${maxAmount}`),
  memo: z.string().max(200, 'Memo cannot exceed 200 characters').optional(),
});

export default function TransferRequestDialog({
  open,
  onOpenChange,
  account,      // { id: "uuid", name: "Treasury #1", balance: "1000" }
  asset,        // { id: "uuid", symbol: "ICP", decimals: 8 }
  tokenId,      // Principal of the token
  identity,     // User's identity
  onSuccess,    // Callback after successful creation
  votingPower = 0, // User's voting power
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Calculate max transferable amount
  const maxAmount = account.balance
    ? bigintToFloat(account.balance, asset.decimals).toFixed(asset.decimals)
    : '0';

  const form = useForm({
    resolver: zodResolver(createTransferSchema(maxAmount)),
    defaultValues: {
      title: '',
      description: '',
      to_address: '',
      amount: '',
      memo: '',
    },
  });

  const handleSubmit = async (data) => {
    debugLog('🚀 Transfer Proposal Submission', () => {
      console.log('Form data:', safeStringify(data));
      console.log('Account:', safeStringify(account));
      console.log('Asset:', safeStringify(asset));
      console.log('Token ID:', tokenId);
      console.log('User voting power:', votingPower);
    });

    setError('');

    // Voting power check
    if (votingPower < MIN_VOTING_POWER_FOR_PROPOSALS) {
      console.error(`❌ Insufficient VP: ${votingPower} < ${MIN_VOTING_POWER_FOR_PROPOSALS}`);
      toast.error('Insufficient Voting Power', {
        description: `You need at least ${MIN_VOTING_POWER_FOR_PROPOSALS.toLocaleString()} VP to create transfer proposals. Current: ${votingPower.toLocaleString()} VP`
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📡 Creating backend service...');
      const accountsService = getOrbitAccountsService(identity);

      // Convert amount using string-based decimal arithmetic to avoid floating point errors
      console.log('💰 Converting amount:', data.amount, 'with decimals:', asset.decimals);

      const convertToBigInt = (amountStr, decimals) => {
        // Ensure decimals is valid
        const dec = decimals ?? 8;

        // Split on decimal point
        const [integer = '0', decimal = ''] = amountStr.split('.');

        // Pad or truncate decimal part
        const paddedDecimal = decimal.padEnd(dec, '0').slice(0, dec);

        // Combine and convert to BigInt
        return BigInt(integer + paddedDecimal);
      };

      const amountInSmallest = convertToBigInt(data.amount, asset.decimals);
      console.log('💰 Converting:', data.amount, '→', amountInSmallest.toString());

      // Build transfer details
      const transferDetails = {
        from_account_id: account.id,
        from_asset_id: asset.id,
        to: data.to_address,
        amount: amountInSmallest,
        memo: data.memo || null,
        title: data.title,
        description: data.description
      };

      console.log('📦 Transfer details:', safeStringify({
        ...transferDetails,
        amount: amountInSmallest.toString() + 'n' // Indicate it's a BigInt
      }));

      // Validate UUIDs before sending
      try {
        validateUUIDs({
          'account ID': transferDetails.from_account_id,
          'asset ID': transferDetails.from_asset_id
        });
        console.log('✅ UUID validation passed');
      } catch (error) {
        throw new Error(error.message);
      }

      // Make backend call
      console.log('🌐 Calling accountsService.createTransferRequest...');
      const result = await accountsService.createTransferRequest({
        stationId,
        accountId: transferDetails.from_account_id,
        toAddress: transferDetails.to,
        assetId: transferDetails.from_asset_id,
        amount: transferDetails.amount,
        network: 'InternetComputer',
        standard: 'ICRC1',
        metadata: transferDetails.memo ? [['memo', transferDetails.memo]] : []
      });

      console.log('📥 Backend response:', safeStringify(result));

      if (result.success) {
        console.log('✅ Proposal created successfully');
        toast.success('Transfer Proposal Created', {
          description: 'Community can now vote on this transfer request'
        });
        onOpenChange(false);
        if (onSuccess) onSuccess();
        form.reset();
      } else {
        throw new Error(result.error || 'Failed to create proposal');
      }
    } catch (err) {
      console.error('❌ Error creating transfer proposal:', err);
      console.error('Error stack:', err.stack);

      // Extract meaningful error message
      let errorMessage = 'An unexpected error occurred';
      if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error('Transfer Proposal Failed', {
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Transfer Proposal</DialogTitle>
          <DialogDescription>
            Propose a transfer from {account.name} ({asset.symbol}). Community will vote on this proposal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Request Title</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="e.g., Payment to Marketing Agency"
              disabled={isSubmitting}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Explain why this transfer is needed..."
              rows={4}
              disabled={isSubmitting}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {votingPower < MIN_VOTING_POWER_FOR_PROPOSALS && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need at least {MIN_VOTING_POWER_FOR_PROPOSALS.toLocaleString()} VP to create transfer proposals.
                Current: {votingPower.toLocaleString()} VP
              </AlertDescription>
            </Alert>
          )}

          <div>
            <AddressInput
              value={form.watch('to_address')}
              onChange={(value) => form.setValue('to_address', value, { shouldValidate: true })}
              label="Recipient Address"
              required={true}
              disabled={isSubmitting}
              blockchain={BlockchainType.InternetComputer}
              helperText="Enter the recipient's Principal ID or Account Identifier"
              error={form.formState.errors.to_address?.message}
              onValidationChange={(state) => {
                // Optional: Handle validation state changes if needed
                if (state.isValid) {
                  form.clearErrors('to_address');
                }
              }}
            />
          </div>

          <div>
            <Label htmlFor="amount">
              Amount ({asset.symbol})
              <span className="text-xs text-muted-foreground ml-2">
                Max: {maxAmount}
              </span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="any"
              {...form.register('amount')}
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="memo">Memo (optional)</Label>
            <Input
              id="memo"
              {...form.register('memo')}
              placeholder="Optional note"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || votingPower < MIN_VOTING_POWER_FOR_PROPOSALS}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Proposal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}