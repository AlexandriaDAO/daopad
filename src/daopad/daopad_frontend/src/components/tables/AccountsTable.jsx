import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw } from 'lucide-react';
import {
  fetchOrbitAccounts,
  selectOrbitAccounts,
  selectOrbitAccountsLoading,
  selectOrbitAccountsError,
} from '@/features/orbit/orbitSlice';

export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol }) {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ limit: 20, offset: 0 });

  // Select data from Redux
  const { accounts = [], total = 0, balances = {} } = useSelector(state =>
    selectOrbitAccounts(state, stationId)
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

  const handleNextPage = () => {
    setPagination({ ...pagination, offset: pagination.offset + pagination.limit });
  };

  const handlePrevPage = () => {
    setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) });
  };

  const formatBalance = (accountId) => {
    const balance = balances[accountId];
    if (!balance) return 'N/A';

    const amount = balance.balance || 0;
    const decimals = balance.decimals || 8;
    const displayAmount = (amount / Math.pow(10, decimals)).toFixed(4);
    return `${displayAmount} ${tokenSymbol || ''}`;
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                          {formatBalance(account.id)}
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
      </CardContent>
    </Card>
  );
}
