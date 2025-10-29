import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Receipt, Plus } from 'lucide-react';
import CreateInvoice from '../components/invoices/CreateInvoice';
import InvoiceList from '../components/invoices/InvoiceList';

interface InvoicesPageProps {
  token?: any;
  orbitStation?: any;
  identity?: any;
  isAuthenticated?: boolean;
}

export default function InvoicesPage({ token, orbitStation, identity, isAuthenticated }: InvoicesPageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleInvoiceCreated = () => {
    // Trigger refresh of invoice list
    setRefreshTrigger(prev => prev + 1);
  };

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