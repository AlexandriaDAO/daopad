import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { RefreshCw, Receipt, ExternalLink } from 'lucide-react';
import { getInvoiceService } from '../../services/backend/invoices/InvoiceService';
import type { Invoice } from '../../declarations/daopad_invoices/daopad_invoices.did';

interface InvoiceListProps {
  token?: any;
  identity?: any;
  refreshTrigger?: number; // To trigger refresh from parent
}

export default function InvoiceList({ token, identity, refreshTrigger }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadInvoices = async () => {
    if (!identity) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const invoiceService = getInvoiceService(identity);
      const result = await invoiceService.getMyInvoices();
      
      if (result.success) {
        setInvoices(result.data);
      } else {
        console.error('Failed to load invoices:', result.error);
        setError(result.error || 'Failed to load invoices');
      }
      
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [identity, refreshTrigger]);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const formatFiatAmount = (amountInCents: bigint) => {
    return `$${(Number(amountInCents) / 100).toFixed(2)}`;
  };

  const formatCryptoAmount = (amount: bigint, collateral: any) => {
    const collateralType = 'ICP' in collateral ? 'ICP' : 'ckUSDT';
    if (collateralType === 'ICP') {
      // ICP has 8 decimals
      return `${(Number(amount) / 100000000).toFixed(8)} ICP`;
    } else if (collateralType === 'ckUSDT') {
      // ckUSDT has 6 decimals
      return `${(Number(amount) / 1000000).toFixed(6)} ckUSDT`;
    }
    return `${amount} ${collateralType}`;
  };

  const getCollateralColor = (collateral: any) => {
    const collateralType = 'ICP' in collateral ? 'ICP' : 'ckUSDT';
    switch (collateralType) {
      case 'ICP': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'ckUSDT': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: any) => {
    if ('Paid' in status) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if ('Inactive' in status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'; // Unpaid
  };

  const openPaymentLink = (url: string) => {
    window.open(url, '_blank');
  };

  if (!identity) {
    return (
      <Card className="bg-executive-darkGray border-executive-mediumGray">
        <CardContent className="py-8 text-center">
          <Receipt className="h-12 w-12 mx-auto text-executive-lightGray/40 mb-4" />
          <p className="text-executive-lightGray/70">
            Please login to view your invoices
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-executive-darkGray border-executive-mediumGray">
        <CardContent className="py-8">
          <div className="flex justify-center items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-executive-lightGray" />
            <span className="text-executive-lightGray/70">Loading invoices...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-executive-darkGray border-executive-mediumGray">
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={loadInvoices}
            variant="outline"
            size="sm"
            className="mt-4 border-executive-gold/30 text-executive-goldLight hover:bg-executive-gold/10 hover:border-executive-gold"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-executive-darkGray border-executive-mediumGray">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-executive-ivory">
            <Receipt className="h-5 w-5" />
            Your Invoices
          </CardTitle>
          <Button 
            onClick={loadInvoices} 
            variant="outline" 
            size="sm"
            className="border-executive-gold/30 text-executive-goldLight hover:bg-executive-gold/10 hover:border-executive-gold"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto text-executive-lightGray/40 mb-4" />
            <p className="text-executive-lightGray/70 mb-2">No invoices created yet</p>
            <p className="text-sm text-executive-lightGray/60">
              Create your first invoice to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border border-executive-mediumGray/30 rounded-lg p-4 bg-executive-mediumGray/20 hover:bg-executive-mediumGray/30 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-lg text-executive-ivory">
                        {formatFiatAmount(invoice.fiat)}
                      </span>
                      <Badge className={`${getStatusColor(invoice.status)} pointer-events-none`}>
                        {'Paid' in invoice.status ? 'Paid' : 'Inactive' in invoice.status ? 'Inactive' : 'Unpaid'}
                      </Badge>
                      <Badge className={`${getCollateralColor(invoice.collateral)} pointer-events-none`}>
                        {'ICP' in invoice.collateral ? 'ICP' : 'ckUSDT'}
                      </Badge>
                    </div>

                    {/* Show crypto amount for paid invoices */}
                    {'Paid' in invoice.status && invoice.crypto > 0 && (
                      <div className="text-sm text-executive-lightGray/90 font-mono">
                        Transferred: {formatCryptoAmount(invoice.crypto, invoice.collateral)}
                      </div>
                    )}

                    {invoice.description && (
                      <p className="text-sm text-executive-lightGray/80">
                        {invoice.description}
                      </p>
                    )}

                    <div className="text-sm text-executive-lightGray/70">
                      Created: {formatDate(invoice.created_at)}
                    </div>

                    <div className="text-xs text-executive-lightGray/60 font-mono">
                      Receiver: {invoice.receiver.toText()}
                    </div>

                    <div className="text-xs text-executive-lightGray/50 font-mono">
                      ID: {invoice.id}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {'Unpaid' in invoice.status && invoice.url && (
                      <Button
                        onClick={() => openPaymentLink(invoice.url)}
                        variant="default"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    {'Paid' in invoice.status && (
                      <Button variant="default" size="sm" disabled>
                        Paid ✓
                      </Button>
                    )}
                    {'Inactive' in invoice.status && (
                      <Button variant="outline" size="sm" disabled>
                        Inactive
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}