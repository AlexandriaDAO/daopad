import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Receipt, Plus, Server, Wallet, RefreshCw } from 'lucide-react';
import CreateInvoice from '../components/invoices/CreateInvoice';
import InvoiceList from '../components/invoices/InvoiceList';
import { getInvoiceService } from '../services/backend/invoices/InvoiceService';

interface InvoicesPageProps {
  token?: any;
  orbitStation?: any;
  identity?: any;
  isAuthenticated?: boolean;
}

export default function InvoicesPage({ token, orbitStation, identity, isAuthenticated }: InvoicesPageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [canisterBalance, setCanisterBalance] = useState<string>('Loading...');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const canisterId = 'heuuj-6aaaa-aaaag-qc6na-cai';

  const handleInvoiceCreated = () => {
    // Trigger refresh of invoice list
    setRefreshTrigger(prev => prev + 1);
  };

  const loadCanisterBalance = async () => {
    if (!identity || !token) return;

    try {
      setIsLoadingBalance(true);
      const invoiceService = getInvoiceService(identity);
      
      // Get balance based on token type
      const tokenSymbol = token.symbol?.toUpperCase();
      if (tokenSymbol === 'ICP') {
        const balanceResult = await invoiceService.getCanisterIcpBalance();
        if (balanceResult.success) {
          // Convert from e8s to ICP
          const icpBalance = Number(balanceResult.data) / 100_000_000;
          setCanisterBalance(`${icpBalance.toFixed(8)} ICP`);
        } else {
          setCanisterBalance('Error loading balance');
        }
      } else if (tokenSymbol === 'CKUSDT' || tokenSymbol === 'USDT') {
        const balanceResult = await invoiceService.getCanisterCkUsdtBalance();
        if (balanceResult.success) {
          // Convert from smallest unit to ckUSDT
          const ckusdtBalance = Number(balanceResult.data) / 1_000_000;
          setCanisterBalance(`${ckusdtBalance.toFixed(6)} ckUSDT`);
        } else {
          setCanisterBalance('Error loading balance');
        }
      } else {
        setCanisterBalance('Unsupported token');
      }
    } catch (error) {
      console.error('Failed to load canister balance:', error);
      setCanisterBalance('Error loading');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    loadCanisterBalance();
  }, [identity, token]);

  return (
    <div className="space-y-6" data-testid="invoices-overview">
      {/* Header Card - Following DaoOverview pattern */}
      <div className="bg-executive-darkGray border border-executive-mediumGray rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-executive-ivory flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Invoices
            </h2>
            <p className="text-executive-lightGray/70 mt-1">
              Manage invoices for {token?.name || 'this DAO'}
            </p>
          </div>

          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!isAuthenticated}
            className="flex items-center gap-2 bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Canister ID Card */}
        <Card className="bg-executive-darkGray border-executive-mediumGray">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-executive-ivory text-lg">
              <Server className="h-5 w-5 text-executive-gold" />
              Backend Canister
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-executive-lightGray/70">Canister ID:</p>
              <p className="font-mono text-sm text-executive-ivory bg-executive-mediumGray/30 p-2 rounded border">
                {canisterId}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Canister Balance Card */}
        <Card className="bg-executive-darkGray border-executive-mediumGray">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-executive-ivory text-lg">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-executive-gold" />
                Canister Balance
              </div>
              <Button
                onClick={loadCanisterBalance}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-executive-lightGray hover:text-executive-ivory hover:bg-executive-mediumGray/30"
                disabled={isLoadingBalance}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-executive-lightGray/70">{token?.name || 'Token'} Balance:</p>
              <p className="text-lg font-semibold text-executive-ivory">
                {canisterBalance}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <InvoiceList
        token={token}
        identity={identity}
        refreshTrigger={refreshTrigger}
      />

      {/* Create Invoice Dialog */}
      <CreateInvoice
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        token={token}
        orbitStation={orbitStation}
        identity={identity}
        onSuccess={handleInvoiceCreated}
      />
    </div>
  );
}