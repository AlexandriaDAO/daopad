import { useOutletContext } from 'react-router-dom';
import InvoicesPage from '../../pages/InvoicesPage';
import { Card, CardContent } from '../../components/ui/card';
import { Receipt, Clock } from 'lucide-react';

export default function DaoInvoices() {
  const { token, orbitStation, identity, isAuthenticated } = useOutletContext<any>();

  // Check if token supports invoices (only ICP and ckUSDT for now)
  const isSupportedToken = (tokenSymbol?: string): boolean => {
    if (!tokenSymbol) return false;
    const symbol = tokenSymbol.toUpperCase();
    return symbol === 'ICP' || symbol === 'CKUSDT' || symbol === 'USDT';
  };

  // Show coming soon card for unsupported tokens
  if (!isSupportedToken(token?.symbol)) {
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
          </div>
        </div>

        {/* Coming Soon Card */}
        <Card className="bg-executive-darkGray border-executive-mediumGray">
          <CardContent className="py-12 text-center">
            <Clock className="h-16 w-16 mx-auto text-executive-lightGray/40 mb-6" />
            <h3 className="text-xl font-semibold text-executive-ivory mb-2">
              Coming Soon
            </h3>
            <p className="text-executive-lightGray/70 mb-4">
              Invoice functionality is currently available for ICP and ckUSDT tokens only.
            </p>
            <p className="text-sm text-executive-lightGray/60">
              Support for {token?.symbol || 'other tokens'} will be added in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <InvoicesPage
      token={token}
      orbitStation={orbitStation}
      identity={identity}
      isAuthenticated={isAuthenticated}
    />
  );
}
