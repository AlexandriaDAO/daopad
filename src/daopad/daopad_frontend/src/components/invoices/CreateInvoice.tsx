import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getInvoiceService } from '../../services/backend/invoices/InvoiceService';
// import { fetchOrbitAccounts, selectOrbitAccountsLoading } from '../../features/orbit/orbitSlice';
// import { selectFormattedAccounts } from '../../features/orbit/orbitSelectors';

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
  const [receiver, setReceiver] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Determine collateral based on token
  const getCollateralForToken = (tokenSymbol?: string): 'ICP' | 'ckUSDT' => {
    if (!tokenSymbol) return 'ICP'; // Default to ICP
    const symbol = tokenSymbol.toUpperCase();
    return symbol === 'CKUSDT' || symbol === 'USDT' ? 'ckUSDT' : 'ICP';
  };

  const collateral = getCollateralForToken(token?.symbol);

  // // Get treasury accounts from Redux
  // const treasuryAccounts = useSelector(state => 
  //   orbitStation ? selectFormattedAccounts(state, orbitStation.station_id, token?.symbol) : []
  // );

  // // Get loading state
  // const isLoadingAccounts = useSelector(state =>
  //   orbitStation ? selectOrbitAccountsLoading(state, orbitStation.station_id) : false
  // );

  // // Fetch treasury accounts when dialog opens
  // useEffect(() => {
  //   if (open && orbitStation && token) {
  //     dispatch(fetchOrbitAccounts({
  //       stationId: orbitStation.station_id,
  //       identity: identity || null,
  //       tokenId: token.canister_id,
  //       searchQuery: '',
  //       pagination: { limit: 20, offset: 0 }
  //     }));
  //   }
  // }, [open, dispatch, orbitStation, token, identity]);

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

    if (!receiver) {
      setError('Please enter a receiver account');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const invoiceService = getInvoiceService(identity);
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      const result = await invoiceService.createInvoice(
        amountInCents,
        collateral,
        description.trim(),
        receiver
      );
      
      if (result.success) {
        // Reset form
        setAmount('');
        setReceiver('');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
        {/* {orbitStation && isLoadingAccounts && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Loading treasury accounts...
            </AlertDescription>
          </Alert>
        )} */}

        {/* No Treasury Accounts Found (only show when not loading) */}
        {/* {orbitStation && !isLoadingAccounts && treasuryAccounts.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No treasury accounts found. Please create treasury accounts before creating invoices.
            </AlertDescription>
          </Alert>
        )} */}

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

          {/* Payment Token Display */}
          <div className="space-y-2">
            <Label>Payment Token</Label>
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
              Payments will be converted to {collateral} and sent to the receiver
            </p>
          </div>

          {/* Treasury Account Selector */}
          <div className="space-y-2">
            <Label htmlFor="receiver">Treasury Account *</Label>
            {/* <Select
              value={selectedAccount}
              onValueChange={setSelectedAccount}
              disabled={isCreating || treasuryAccounts.length === 0}
            >
              <SelectTrigger className="h-12">
                <SelectValue 
                  placeholder={
                    treasuryAccounts.length === 0 
                      ? "No treasury accounts available" 
                      : "Select treasury account"
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                {treasuryAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {account.name || 'Unnamed Account'}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {account.id}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select> */}
            <Input
              id="receiver"
              type="text"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="e.g., rdmx6-jaaaa-aaaaa-aaadq-cai"
              className="py-3"
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500">
              Treasury account where payments will be received
            </p>
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
                !receiver || receiver.length === 0 || 
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