import React, { useEffect } from 'react';
import * as z from 'zod';
import { BaseFormDialog } from '@/components/shared/BaseFormDialog';
import {
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
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStationService } from '@/hooks/useStationService';
import { Info, FileText, Tag } from 'lucide-react';

// Validation schema for asset form
const assetFormSchema = z.object({
  blockchain: z.enum(['InternetComputer', 'Ethereum', 'Bitcoin'], {
    required_error: 'Please select a blockchain',
  }),
  standards: z.array(z.string()).min(1, 'At least one standard must be selected'),
  name: z.string().min(1, 'Name is required').max(64, 'Name must be less than 64 characters'),
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must be less than 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Symbol must contain only uppercase letters and numbers'),
  decimals: z.coerce
    .number()
    .int('Decimals must be an integer')
    .min(0, 'Decimals cannot be negative')
    .max(18, 'Decimals cannot exceed 18'),
  metadata: z.record(z.string()).optional(),
});

// Available standards per blockchain
const BLOCKCHAIN_STANDARDS = {
  InternetComputer: ['ICRC1', 'ICRC2', 'ICP_Native', 'EXT'],
  Ethereum: ['ERC20', 'ERC721', 'ERC1155'],
  Bitcoin: ['Native', 'BRC20', 'Runes'],
};

export default function AssetDialog({ open, onOpenChange, asset, mode, onSaved }) {
  const station = useStationService();

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const handleSubmit = async (data) => {
    if (isCreateMode) {
      await station.addAsset({
        blockchain: { [data.blockchain]: null },
        standards: data.standards.map(s => ({ [s]: null })),
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        metadata: Object.entries(data.metadata || {}).map(([key, value]) => ({
          key,
          value: value.toString(),
        })),
      });
    } else if (isEditMode) {
      await station.editAsset({
        asset_id: asset.id,
        name: [data.name],
        symbol: [data.symbol],
        change_metadata: Object.entries(data.metadata || {}).map(([key, value]) => ({
          OverrideSpecifiedBy: [{
            key,
            value: value.toString(),
          }],
        })),
      });
    }

    onSaved?.();
  };

  // Determine default values based on mode
  const getDefaultValues = () => {
    if (asset && (isEditMode || isViewMode)) {
      return {
        blockchain: asset.blockchain || 'InternetComputer',
        standards: asset.standards || [],
        name: asset.name || '',
        symbol: asset.symbol || '',
        decimals: asset.decimals || 8,
        metadata: asset.metadata || {},
      };
    }
    return {
      blockchain: 'InternetComputer',
      standards: [],
      name: '',
      symbol: '',
      decimals: 8,
      metadata: {},
    };
  };

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isViewMode ? 'Asset Details' :
        isEditMode ? 'Edit Asset' :
        'Add New Asset'
      }
      description={
        isViewMode ? 'View the details of this asset' :
        isEditMode ? 'Modify the asset configuration' :
        'Configure a new asset for your treasury'
      }
      schema={assetFormSchema}
      defaultValues={getDefaultValues()}
      onSubmit={handleSubmit}
      submitText={isCreateMode ? 'Create Asset' : 'Save Changes'}
      maxWidth="sm:max-w-[600px]"
      tabs={[
        { value: 'basic', label: 'Basic Information', icon: FileText },
        { value: 'metadata', label: 'Metadata', icon: Tag },
      ]}
    >
      {(form) => {
        const watchedBlockchain = form.watch('blockchain');
        const availableStandards = BLOCKCHAIN_STANDARDS[watchedBlockchain] || [];

        const handleStandardToggle = (standard) => {
          const currentStandards = form.getValues('standards');
          const newStandards = currentStandards.includes(standard)
            ? currentStandards.filter(s => s !== standard)
            : [...currentStandards, standard];
          form.setValue('standards', newStandards);
        };

        return (
          <>
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Blockchain Selection */}
              <FormField
                control={form.control}
                name="blockchain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blockchain</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isViewMode || isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a blockchain" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="InternetComputer">Internet Computer</SelectItem>
                        <SelectItem value="Ethereum">Ethereum</SelectItem>
                        <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The blockchain network for this asset
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Standards Selection */}
              <FormField
                control={form.control}
                name="standards"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standards</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                        {availableStandards.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Select a blockchain first
                          </p>
                        ) : (
                          availableStandards.map((standard) => (
                            <Badge
                              key={standard}
                              variant={field.value.includes(standard) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => !isViewMode && !isEditMode && handleStandardToggle(standard)}
                            >
                              {standard}
                            </Badge>
                          ))
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select the token standards this asset implements
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Asset Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Internet Computer"
                        {...field}
                        disabled={isViewMode}
                      />
                    </FormControl>
                    <FormDescription>
                      The full name of the asset
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Asset Symbol */}
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., ICP"
                        {...field}
                        disabled={isViewMode}
                        className="uppercase"
                      />
                    </FormControl>
                    <FormDescription>
                      The ticker symbol (uppercase letters and numbers only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Decimals */}
              <FormField
                control={form.control}
                name="decimals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decimals</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="18"
                        {...field}
                        disabled={isViewMode || isEditMode}
                      />
                    </FormControl>
                    <FormDescription>
                      The number of decimal places for this asset (0-18)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Additional metadata fields for this asset
                </AlertDescription>
              </Alert>

              {watchedBlockchain === 'InternetComputer' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Ledger Canister ID</label>
                    <Input
                      placeholder="e.g., ryjl3-tyaaa-aaaaa-aaaba-cai"
                      disabled={isViewMode}
                      onChange={(e) => {
                        const metadata = form.getValues('metadata');
                        form.setValue('metadata', {
                          ...metadata,
                          ledger_canister_id: e.target.value,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Index Canister ID (Optional)</label>
                    <Input
                      placeholder="e.g., rdmx6-iaaaa-aaaaa-aaadq-cai"
                      disabled={isViewMode}
                      onChange={(e) => {
                        const metadata = form.getValues('metadata');
                        form.setValue('metadata', {
                          ...metadata,
                          index_canister_id: e.target.value,
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              {watchedBlockchain === 'Ethereum' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Contract Address</label>
                    <Input
                      placeholder="0x..."
                      disabled={isViewMode}
                      onChange={(e) => {
                        const metadata = form.getValues('metadata');
                        form.setValue('metadata', {
                          ...metadata,
                          contract_address: e.target.value,
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </>
        );
      }}
    </BaseFormDialog>
  );
}
