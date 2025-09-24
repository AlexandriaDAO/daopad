import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, CheckCircle2, ExternalLink, RefreshCw, Search, Send, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import TransferRequestDialog from '@/components/orbit/TransferRequestDialog';
import CreateAccountDialog from '@/components/orbit/CreateAccountDialog';

export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol, votingPower }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [transferDialog, setTransferDialog] = useState({
    open: false,
    account: null,
    asset: null
  });

  const debouncedSearch = useDebounce(searchQuery, 300);
  const pagination = usePagination({ pageSize: 20 });

  const backendService = React.useMemo(() => {
    if (!identity) return null;
    return new DAOPadBackendService(identity);
  }, [identity]);

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
    enabled: !!stationId && !!backendService,
    refetchInterval: 60000,  // Adjusted from 30s to 60s for performance
    retry: 1,
  });

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
          const balancesMap = {};
          response.data.forEach((balance) => {
            if (balance && balance.length > 0) {
              const balanceData = balance[0];
              if (balanceData && balanceData.account_id) {
                balancesMap[balanceData.account_id] = balanceData;
              }
            } else if (balance && balance.account_id) {
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
    enabled: !!stationId && !!backendService && accountIds.length > 0,
    refetchInterval: 60000,
  });

  const accounts = accountsData?.accounts || [];
  const privileges = accountsData?.privileges || [];

  const formatTokenBalance = (balanceValue, decimals = 8) => {
    if (!balanceValue && balanceValue !== 0) return '0';
    const divisor = Math.pow(10, decimals);
    const amount = Number(balanceValue) / divisor;

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

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const openInOrbitStation = (accountId) => {
    const orbitUrl = `https://app.orbit.global/v0.5.1/en/accounts/${accountId}`;
    window.open(orbitUrl, '_blank');
  };

  if (!stationId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No treasury station configured
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load accounts: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {votingPower >= 100 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreateAccountDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          )}
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No treasury accounts found
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => {
              const asset = account.assets[0];
              const balance = asset?.balance;
              const privilege = privileges.find(p => p.id === account.id);
              const updatedBalance = balancesData?.[account.id];
              const displayBalance = updatedBalance || balance;

              return (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="font-medium">{account.name}</div>
                    {account.metadata?.some(m => m.key === 'type' && m.value === 'reserves') && (
                      <Badge variant="secondary" className="mt-1">Reserves</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {displayBalance && displayBalance.balance !== undefined ? (
                      <div className="font-mono">
                        {formatTokenBalance(displayBalance.balance, displayBalance.decimals || 8)} ICP
                        {displayBalance.query_state === 'stale' && (
                          <div className="text-xs text-muted-foreground">Updating...</div>
                        )}
                        {displayBalance.query_state === 'stale_refreshing' && (
                          <div className="text-xs text-yellow-600">Refreshing...</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-mono">0 ICP</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.addresses[0] && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs truncate max-w-[200px]">
                          {account.addresses[0].address}
                        </code>
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
                    <div className="flex flex-wrap gap-1">
                      {privilege?.can_transfer && (
                        <Badge variant="outline" className="text-xs">Transfer</Badge>
                      )}
                      {privilege?.can_edit && (
                        <Badge variant="outline" className="text-xs">Edit</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {privilege?.can_transfer && displayBalance?.balance > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTransferDialog({
                            open: true,
                            account: {
                              id: account.id,
                              name: account.name,
                              balance: displayBalance.balance
                            },
                            asset: {
                              id: "7802cbab-221d-4e49-b764-a695ea6def1a", // ICP asset UUID
                              symbol: "ICP",
                              decimals: 8
                            }
                          })}
                          title="Request Transfer"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInOrbitStation(account.id)}
                        title="Open in Orbit Station"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

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

      {transferDialog.open && (
        <TransferRequestDialog
          open={transferDialog.open}
          onOpenChange={(open) => setTransferDialog({...transferDialog, open})}
          account={transferDialog.account}
          asset={transferDialog.asset}
          tokenId={tokenId}
          identity={identity}
          onSuccess={() => {
            refetch();
            setTransferDialog({open: false, account: null, asset: null});
          }}
        />
      )}

      <CreateAccountDialog
        open={createAccountDialogOpen}
        onClose={() => setCreateAccountDialogOpen(false)}
        tokenId={tokenId}
        tokenSymbol={tokenSymbol}
        onSuccess={(data) => {
          console.log('Account creation request created:', data);
          refetch();
        }}
      />
    </>
  );
}