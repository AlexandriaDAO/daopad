import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw, ArrowUpRight } from 'lucide-react';
import {
  fetchOrbitAccounts,
  selectOrbitAccountsLoading,
  selectOrbitAccountsError,
} from '@/features/orbit/orbitSlice';
import { selectFormattedAccounts } from '@/features/orbit/orbitSelectors';
import TransferRequestDialog from '../orbit/TransferRequestDialog';
import { useToast } from '@/hooks/use-toast';

export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol, votingPower }) {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ limit: 20, offset: 0 });
  const [transferDialog, setTransferDialog] = useState({
    open: false,
    account: null,
    asset: null
  });

  // Select data from Redux with formatted balances
  const accounts = useSelector(state =>
    selectFormattedAccounts(state, stationId, tokenSymbol)
  );
  const total = useSelector(state =>
    state.orbit.accounts.data[stationId]?.total || 0
  );
  const isLoading = useSelector(state =>
    selectOrbitAccountsLoading(state, stationId)
  );
  const error = useSelector(state =>
    selectOrbitAccountsError(state, stationId)
  );

  // Fetch accounts on mount and when dependencies change
  useEffect(() => {
    if (stationId && identity) {
      dispatch(fetchOrbitAccounts({
        stationId,
        identity,
        searchQuery,
        pagination
      }));
    }
  }, [dispatch, stationId, identity, searchQuery, pagination]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPagination({ ...pagination, offset: 0 }); // Reset to first page
  };

  const handleRefresh = () => {
    dispatch(fetchOrbitAccounts({
      stationId,
      identity,
      searchQuery,
      pagination
    }));
  };

  const handleTransfer = (account) => {
    // Helper function to safely stringify objects with BigInt
    const safeStringify = (obj) => {
      return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() + 'n' : value
      , 2);
    };

    console.group('🔍 Transfer Button Clicked');
    console.log('Account data:', safeStringify(account));

    // Validate account structure
    if (!account.id) {
      console.error('❌ Account missing ID');
      toast.error('Invalid Account', {
        description: 'Account data is malformed. Please refresh the page.'
      });
      console.groupEnd();
      return;
    }

    // Get assets from account
    const assets = account.assets || [];
    console.log(`Found ${assets.length} assets on account`);

    if (assets.length === 0) {
      console.error('❌ No assets found on account');
      toast.error('No Assets Available', {
        description: 'This account has no assets to transfer. Please add assets first.'
      });
      console.groupEnd();
      return;
    }

    // Use first asset (could be enhanced to show asset picker)
    const asset = assets[0];
    console.log('Selected asset:', safeStringify(asset));

    // Validate asset has required fields
    if (!asset.id || !asset.symbol) {
      console.error('❌ Asset missing required fields (id or symbol)');
      toast.error('Invalid Asset Data', {
        description: `Asset is missing required information. ID: ${asset.id || 'missing'}, Symbol: ${asset.symbol || 'missing'}`
      });
      console.groupEnd();
      return;
    }

    console.log('✅ Validation passed, opening transfer dialog');
    console.groupEnd();

    setTransferDialog({
      open: true,
      account,
      asset
    });
  };

  const handleTransferComplete = () => {
    // Refresh accounts after successful transfer
    handleRefresh();
  };

  const handleNextPage = () => {
    setPagination({ ...pagination, offset: pagination.offset + pagination.limit });
  };

  const handlePrevPage = () => {
    setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Error loading accounts: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Treasury Accounts</CardTitle>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading && accounts.length === 0 ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Blockchain</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No accounts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.name || 'Unnamed Account'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {account.id.slice(0, 8)}...{account.id.slice(-6)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {account.blockchain || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {account.balanceFormatted}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransfer(account)}
                            disabled={!identity}
                          >
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Transfer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {accounts.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, total)} of {total} accounts
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={pagination.offset === 0 || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNextPage}
                    disabled={pagination.offset + pagination.limit >= total || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Transfer Request Dialog */}
        {transferDialog.open && transferDialog.account && transferDialog.asset && (
          <TransferRequestDialog
            open={transferDialog.open}
            onOpenChange={(open) => setTransferDialog(prev => ({ ...prev, open }))}
            account={transferDialog.account}
            asset={transferDialog.asset}
            tokenId={tokenId}
            identity={identity}
            onSuccess={handleTransferComplete}
            votingPower={votingPower}
          />
        )}
      </CardContent>
    </Card>
  );
}
