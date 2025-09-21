import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, RefreshCw, Wallet, Search, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DAOPadBackendService } from '@/services/daopadBackend';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { Principal } from '@dfinity/principal';

export default function AccountsPage({ token, identity, orbitStation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(null);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const pagination = usePagination({ pageSize: 20 });

  // Get station ID from props
  const stationId = orbitStation?.station_id;
  const hasStation = Boolean(stationId);

  // Initialize backend service
  const backendService = React.useMemo(() => {
    if (!identity) return null;
    return new DAOPadBackendService(identity);
  }, [identity]);

  // Fetch accounts list
  const {
    data: accountsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['orbit-accounts', stationId, pagination.page, debouncedSearch],
    queryFn: async () => {
      if (!stationId || !backendService) {
        return { accounts: [], total: 0, privileges: [] };
      }

      try {
        const stationPrincipal = Principal.fromText(stationId);
        const response = await backendService.listOrbitAccounts(
          stationPrincipal,
          debouncedSearch || undefined,
          pagination.limit,
          pagination.offset
        );

        if (response.success) {
          pagination.setTotal(response.data.total);
          return response.data;
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
        throw err;
      }
    },
    enabled: !!stationId && hasStation && !!backendService,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });

  // Auto-fetch balances for displayed accounts
  const accountIds = accountsData?.accounts?.map(a => a.id) || [];

  const { data: balancesData } = useQuery({
    queryKey: ['orbit-account-balances', stationId, accountIds],
    queryFn: async () => {
      if (!stationId || !backendService || accountIds.length === 0) {
        return {};
      }

      try {
        const stationPrincipal = Principal.fromText(stationId);
        const response = await backendService.fetchOrbitAccountBalances(
          stationPrincipal,
          accountIds
        );

        if (response.success) {
          // Convert array to object indexed by account_id
          const balancesMap = {};
          response.data.forEach((balance) => {
            if (balance && balance.length > 0) {
              // balance is an array with one element
              const balanceData = balance[0];
              if (balanceData && balanceData.account_id) {
                balancesMap[balanceData.account_id] = balanceData;
              }
            } else if (balance && balance.account_id) {
              // balance is directly the object
              balancesMap[balance.account_id] = balance;
            }
          });
          return balancesMap;
        } else {
          console.error('Failed to fetch balances:', response.error);
          return {};
        }
      } catch (err) {
        console.error('Failed to fetch balances:', err);
        return {};
      }
    },
    enabled: !!stationId && hasStation && !!backendService && accountIds.length > 0,
    refetchInterval: 60000, // Refresh balances every 60 seconds
  });

  const accounts = accountsData?.accounts || [];
  const privileges = accountsData?.privileges || [];

  // Format balance with proper decimals
  const formatTokenBalance = (balanceValue, decimals = 8) => {
    if (!balanceValue && balanceValue !== 0) return '0';
    const divisor = Math.pow(10, decimals);
    const amount = Number(balanceValue) / divisor;

    // Format with appropriate decimal places
    if (amount < 0.01) {
      return amount.toFixed(8);
    } else if (amount < 1) {
      return amount.toFixed(4);
    } else if (amount < 1000) {
      return amount.toFixed(2);
    } else {
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  };

  // Copy address to clipboard
  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Open account in Orbit Station
  const openInOrbitStation = (accountId) => {
    const orbitUrl = `https://app.orbit.global/v0.5.1/en/accounts/${accountId}`;
    window.open(orbitUrl, '_blank');
  };

  if (!hasStation) {
    return null; // Don't show anything if no station
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Treasury Accounts</CardTitle>
          <CardDescription className="text-destructive">
            Failed to load accounts: {error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Treasury Accounts
              </CardTitle>
              <CardDescription>
                Manage treasury accounts and view balances
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Balance (ICP)</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No treasury accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => {
                    const asset = account.assets[0]; // Assuming ICP is the first/only asset
                    const balance = asset?.balance;
                    const privilege = privileges.find(p => p.id === account.id);

                    // Get updated balance from balances query if available (now indexed by account_id)
                    const updatedBalance = balancesData?.[account.id];
                    const displayBalance = updatedBalance || balance;

                    return (
                      <TableRow key={account.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {account.name}
                          {account.metadata?.some(m => m.key === 'type' && m.value === 'reserves') && (
                            <Badge variant="secondary" className="ml-2">Reserves</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {displayBalance && displayBalance.balance !== undefined ? (
                            <div className="flex flex-col">
                              <span className="font-mono font-medium">
                                {formatTokenBalance(displayBalance.balance, displayBalance.decimals || 8)}
                              </span>
                              {displayBalance.query_state === 'stale' && (
                                <span className="text-xs text-muted-foreground">Updating...</span>
                              )}
                              {displayBalance.query_state === 'stale_refreshing' && (
                                <span className="text-xs text-yellow-600">Refreshing...</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {account.addresses[0] && (
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="truncate max-w-[200px]">
                                {account.addresses[0].address}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyAddress(account.addresses[0].address)}
                                className="h-6 w-6 p-0"
                              >
                                {copiedAddress === account.addresses[0].address ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {privilege?.can_transfer && (
                              <Badge variant="outline" className="text-xs">Can Transfer</Badge>
                            )}
                            {privilege?.can_edit && (
                              <Badge variant="outline" className="text-xs">Can Edit</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInOrbitStation(account.id)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {accounts.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {accounts.length} of {accountsData?.total || 0} accounts
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.previousPage()}
                  disabled={!pagination.hasPrevious}
                >
                  Previous
                </Button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.nextPage()}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}