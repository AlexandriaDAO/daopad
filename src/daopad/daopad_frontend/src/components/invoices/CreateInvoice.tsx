import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getInvoiceService } from '../../services/backend/invoices/InvoiceService';
import { getOrbitAccountsService } from '../../services/backend';
import { parseIcrc1Address, formatSubaccount } from '../../utils/icrc1';

interface CreateInvoiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: any;
  orbitStation?: any;
  identity?: any;
  onSuccess?: () => void;
}

export default function CreateInvoice({
  open,
  onOpenChange,
  token,
  orbitStation,
  identity,
  onSuccess
}: CreateInvoiceProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [collateral, setCollateral] = useState<'ICP' | 'ckUSDT'>('ICP');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Treasury account state
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Fetch treasury accounts when dialog opens
  useEffect(() => {
    if (open && orbitStation && identity) {
      fetchTreasuryAccounts();
    }
  }, [open, orbitStation, identity, token]);

  // Update selected account when collateral changes
  useEffect(() => {
    const compatibleAccounts = treasuryAccounts.filter(account =>
      account.assets?.some((asset: any) => asset.asset_symbol === collateral)
    );

    if (compatibleAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(compatibleAccounts[0].id);
    }
  }, [collateral, treasuryAccounts]);

  async function fetchTreasuryAccounts() {
    if (!identity || !orbitStation) return;

    setIsLoadingAccounts(true);
    setError('');

    try {
      const accountsService = getOrbitAccountsService(identity);
      // For equity stations (LLCs), use station_id directly
      // For token-based DAOs, use token.canister_id
      const stationOrTokenId = token?.canister_id || orbitStation.station_id;
      const response = await accountsService.getTreasuryAccountsWithBalances(stationOrTokenId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load treasury accounts');
      }

      console.log('[CreateInvoice] Treasury accounts loaded:', response.data);
      console.log('[CreateInvoice] First account structure:', response.data[0]);
      if (response.data[0]?.assets?.[0]) {
        console.log('[CreateInvoice] First asset structure:', response.data[0].assets[0]);
        console.log('[CreateInvoice] Balance object keys:', Object.keys(response.data[0].assets[0].balance));
        console.log('[CreateInvoice] Full balance object:', JSON.stringify(response.data[0].assets[0].balance, null, 2));
      }

      setTreasuryAccounts(response.data);

      // Auto-select first compatible account
      const compatible = response.data.find((acc: any) =>
        acc.assets?.some((asset: any) => asset.asset_symbol === collateral)
      );
      if (compatible) {
        setSelectedAccountId(compatible.id);
      } else {
        console.log('[CreateInvoice] No compatible account found for collateral:', collateral);
        console.log('[CreateInvoice] Accounts:', response.data.map((a: any) => ({
          name: a.name,
          assets: a.assets?.map((asset: any) => ({
            asset_id: asset.asset_id,
            asset_symbol: asset.asset_symbol,
            balance: asset.balance
          }))
        })));
      }
    } catch (err) {
      console.error('Failed to load treasury accounts:', err);
      setError('Failed to load treasury accounts. Please try again.');
    } finally {
      setIsLoadingAccounts(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identity) {
      setError('Please login first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select a treasury account');
      return;
    }

    if (!orbitStation) {
      setError('No orbit station found');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Find selected account
      const selectedAccount = treasuryAccounts.find(acc => acc.id === selectedAccountId);

      if (!selectedAccount) {
        setError('Selected account not found');
        return;
      }

      // Get ICRC1 address for the account
      const icrc1Address = selectedAccount.addresses?.find(
        (addr: any) => addr.format === 'icrc1_account'
      );

      if (!icrc1Address) {
        setError('No ICRC1 address found for selected account');
        return;
      }

      const invoiceService = getInvoiceService(identity);
      const amountInCents = Math.round(parseFloat(amount) * 100);

      const result = await invoiceService.createInvoice(
        amountInCents,
        collateral,
        description.trim() || null,
        orbitStation.station_id,
        selectedAccountId,
        icrc1Address.address
      );

      if (result.success) {
        // Reset form
        setAmount('');
        setSelectedAccountId('');
        setDescription('');

        onSuccess?.();
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to create invoice');
      }

    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError('Failed to create invoice. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount.toString());
    setError('');
  };

  // Filter accounts by selected collateral
  const compatibleAccounts = treasuryAccounts.filter(account =>
    account.assets?.some((asset: any) => asset.asset_symbol === collateral)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice for {token?.name || 'this DAO'}
          </DialogDescription>
        </DialogHeader>

        {/* No Treasury Station Warning */}
        {!orbitStation && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No treasury station found. Treasury accounts are required to create invoices.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading Treasury Accounts */}
        {orbitStation && isLoadingAccounts && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Loading treasury accounts...
            </AlertDescription>
          </Alert>
        )}

        {/* No Treasury Accounts Found (only show when not loading) */}
        {orbitStation && !isLoadingAccounts && treasuryAccounts.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No treasury accounts found. Please create treasury accounts before creating invoices.
            </AlertDescription>
          </Alert>
        )}

        {/* No Compatible Accounts for Selected Collateral */}
        {orbitStation && !isLoadingAccounts && treasuryAccounts.length > 0 && compatibleAccounts.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No treasury accounts found that support {collateral}. Please configure an account with {collateral} in Orbit Station.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preset Amount Buttons */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Amount Selection</Label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50, 100, 250, 500].map((presetAmount) => (
                <Button
                  key={presetAmount}
                  type="button"
                  variant={amount === presetAmount.toString() ? "default" : "outline"}
                  onClick={() => handlePresetAmount(presetAmount)}
                  disabled={isCreating}
                  className="text-sm"
                >
                  ${presetAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD) *</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                $
              </div>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="pl-8 pr-16"
                disabled={isCreating}
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                USD
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Invoice description"
              disabled={isCreating}
            />
          </div>

          {/* Collateral Selection */}
          <div className="space-y-2">
            <Label>Payment Currency *</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={collateral === 'ICP' ? "default" : "outline"}
                onClick={() => setCollateral('ICP')}
                disabled={isCreating}
                className="flex items-center justify-center gap-2"
              >
                <div className={`w-3 h-3 rounded-full ${collateral === 'ICP' ? 'bg-white' : 'bg-gray-400'}`} />
                ICP
              </Button>
              <Button
                type="button"
                variant={collateral === 'ckUSDT' ? "default" : "outline"}
                onClick={() => setCollateral('ckUSDT')}
                disabled={isCreating}
                className="flex items-center justify-center gap-2"
              >
                <div className={`w-3 h-3 rounded-full ${collateral === 'ckUSDT' ? 'bg-white' : 'bg-gray-400'}`} />
                ckUSDT
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Choose which cryptocurrency to receive after USD payment conversion
            </p>
          </div>

          {/* Payment Token Display */}
          <div className="space-y-2">
            <Label>Selected Payment Currency</Label>
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                collateral === 'ICP'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
              }`}>
                {collateral}
              </div>
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {collateral === 'ICP' ? 'Internet Computer' : 'Chain Key USDT'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              USD payments will be converted to {collateral} and sent to the treasury account
            </p>
          </div>

          {/* Treasury Account Selector */}
          <div className="space-y-2">
            <Label htmlFor="account">Treasury Account *</Label>
            {isLoadingAccounts ? (
              <div className="flex items-center justify-center p-4 border rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Loading accounts...</span>
              </div>
            ) : compatibleAccounts.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No treasury accounts found that support {collateral}.
                  Please configure an account in Orbit Station first.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                  disabled={isCreating || compatibleAccounts.length === 0}
                >
                  <SelectTrigger className="h-auto min-h-[48px]">
                    <SelectValue placeholder="Select treasury account" />
                  </SelectTrigger>
                  <SelectContent>
                    {compatibleAccounts.map((account) => {
                      const asset = account.assets?.find((a: any) => a.asset_symbol === collateral);
                      const icrc1Addr = account.addresses?.find((a: any) => a.format === 'icrc1_account');
                      const parsed = icrc1Addr ? parseIcrc1Address(icrc1Addr.address) : null;

                      return (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex flex-col items-start py-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {account.name || 'Unnamed Account'}
                              </span>
                              {asset?.balance && (
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  • {Number(asset.balance.balance) / Math.pow(10, asset.balance.decimals)} {collateral}
                                </span>
                              )}
                            </div>
                            {parsed && (
                              <div className="flex flex-col gap-0.5 mt-1">
                                <span className="text-xs text-gray-500 font-mono">
                                  {parsed.owner.toText().substring(0, 20)}...
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatSubaccount(parsed.subaccount)}
                                </span>
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Payments will be sent to this account's ICRC1 address
                </p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !amount ||
                parseFloat(amount) <= 0 ||
                !selectedAccountId ||
                compatibleAccounts.length === 0 ||
                isCreating
              }
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCreating ? 'Creating...' : `Create Invoice - $${amount || '0.00'}`}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            How it works:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Invoice creates a payment link</li>
            <li>• Payments go to DAO treasury accounts</li>
            <li>• Track payment status in invoice list</li>
            <li>• Share invoice link with payers</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}