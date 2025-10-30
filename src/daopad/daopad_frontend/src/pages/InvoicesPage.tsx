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
  const [icpBalance, setIcpBalance] = useState<string>('Loading...');
  const [ckusdtBalance, setCkusdtBalance] = useState<string>('Loading...');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const canisterId = 'heuuj-6aaaa-aaaag-qc6na-cai';

  const handleInvoiceCreated = () => {
    // Trigger refresh of invoice list
    setRefreshTrigger(prev => prev + 1);
  };

  const loadCanisterBalances = async () => {
    if (!identity) return;

    try {
      setIsLoadingBalance(true);
      const invoiceService = getInvoiceService(identity);

      // Load ICP balance
      const icpResult = await invoiceService.getCanisterIcpBalance();
      if (icpResult.success) {
        const balance = Number(icpResult.data) / 100_000_000;
        setIcpBalance(`${balance.toFixed(8)} ICP`);
      } else {
        setIcpBalance('Error loading');
      }

      // Load ckUSDT balance
      const ckusdtResult = await invoiceService.getCanisterCkUsdtBalance();
      if (ckusdtResult.success) {
        const balance = Number(ckusdtResult.data) / 1_000_000;
        setCkusdtBalance(`${balance.toFixed(6)} ckUSDT`);
      } else {
        setCkusdtBalance('Error loading');
      }

    } catch (error) {
      console.error('Failed to load balances:', error);
      setIcpBalance('Error loading');
      setCkusdtBalance('Error loading');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    loadCanisterBalances();
  }, [identity]);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* ICP Balance Card */}
        <Card className="bg-executive-darkGray border-executive-mediumGray">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-executive-ivory text-lg">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-executive-gold" />
                ICP Balance
              </div>
              <Button
                onClick={loadCanisterBalances}
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
            <p className="text-lg font-semibold text-executive-ivory">{icpBalance}</p>
          </CardContent>
        </Card>

        {/* ckUSDT Balance Card */}
        <Card className="bg-executive-darkGray border-executive-mediumGray">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-executive-ivory text-lg">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-executive-gold" />
                ckUSDT Balance
              </div>
              <Button
                onClick={loadCanisterBalances}
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
            <p className="text-lg font-semibold text-executive-ivory">{ckusdtBalance}</p>
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