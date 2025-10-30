import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, RefreshCw, ArrowUpRight, ChevronDown, ChevronRight } from 'lucide-react';
import {
  fetchOrbitAccounts,
  fetchTreasuryAssets,
  selectOrbitAccountsLoading,
  selectOrbitAccountsError,
} from '@/features/orbit/orbitSlice';
import { selectFormattedAccounts } from '@/features/orbit/orbitSelectors';
import TransferRequestDialog from '../orbit/TransferRequestDialog';
import { useToast } from '@/hooks/use-toast';
import { safeStringify, debugLog } from '@/utils/logging';

export default function AccountsTable({ stationId, identity, tokenId, tokenSymbol, votingPower, loadingVotingPower = false, isEquityStation = false }) {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ limit: 20, offset: 0 });
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [transferDialog, setTransferDialog] = useState({
    open: false,
    account: null,
    asset: null
  });

  // Select data from Redux with formatted balances
  const accounts = useSelector(state =>
    selectFormattedAccounts(state, stationId, tokenSymbol)
  );
  const total = useSelector(state => {
    const rawTotal = state.orbit.accounts.data[stationId]?.total || 0;
    // Convert BigInt to number if necessary
    return typeof rawTotal === 'bigint' ? Number(rawTotal) : rawTotal;
  });
  const isLoading = useSelector(state =>
    selectOrbitAccountsLoading(state, stationId)
  );
  const error = useSelector(state =>
    selectOrbitAccountsError(state, stationId)
  );

  // Get asset metadata from Redux
  const availableAssets = useSelector(state => {
    const tokenAssets = state.orbit.assets?.data?.[tokenId];
    return Array.isArray(tokenAssets) ? tokenAssets : [];
  });

  // Create asset metadata Map for O(1) lookup
  const assetMetadataMap = useMemo(() => {
    return new Map(availableAssets.map(asset => [asset.id, asset]));
  }, [availableAssets]);

  // Toggle account expansion
  const toggleExpand = useCallback((accountId: string): void => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  // Fetch asset metadata on mount
  useEffect(() => {
    if (tokenId) {
      dispatch(fetchTreasuryAssets({
        tokenId,
        identity: identity || null
      }));
    }
  }, [dispatch, tokenId, identity]);

  // Fetch accounts on mount and when dependencies change
  useEffect(() => {
    if (stationId && tokenId) {
      dispatch(fetchOrbitAccounts({
        stationId,
        identity: identity || null,
        tokenId,
        searchQuery,
        pagination
      }));
    }
  }, [dispatch, stationId, identity, tokenId, searchQuery, pagination]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPagination({ ...pagination, offset: 0 }); // Reset to first page
  };

  const handleRefresh = () => {
    dispatch(fetchOrbitAccounts({
      stationId,
      identity: identity || null,
      tokenId,
      searchQuery,
      pagination
    }));
  };

  const handleTransfer = (account) => {
    debugLog('🔍 Transfer Button Clicked', () => {
      console.log('Account data:', safeStringify(account));
    });

    // Validate account structure
    if (!account.id) {
      console.error('❌ Account missing ID');
      toast.error('Invalid Account', {
        description: 'Account data is malformed. Please refresh the page.'
      });
      return;
    }

    // Get assets from account
    const assets = account.assets || [];

    debugLog('Asset Validation', () => {
      console.log(`Found ${assets.length} assets on account`);
    });

    if (assets.length === 0) {
      console.error('❌ No assets found on account');
      toast.error('No Assets Available', {
        description: 'This account has no assets to transfer. Please add assets first.'
      });
      return;
    }

    // ENHANCED: Smart asset selection logic
    let selectedAsset = null;
    let selectionReason = '';

    // Strategy 1: If only one asset, use it
    if (assets.length === 1) {
      selectedAsset = assets[0];
      selectionReason = 'Only asset available';
    }
    // Strategy 2: Find asset with highest balance
    else {
      const assetWithHighestBalance = assets.reduce((max, curr) => {
        const maxBalance = max.balance?.balance || max.balance || 0n;
        const currBalance = curr.balance?.balance || curr.balance || 0n;
        return currBalance > maxBalance ? curr : max;
      }, assets[0]);

      const highestBalance = assetWithHighestBalance.balance?.balance || 0n;

      if (highestBalance > 0n) {
        selectedAsset = assetWithHighestBalance;
        selectionReason = 'Highest balance';
      } else {
        // All have zero balance, prefer known tokens
        const preferredAssets = ['ICP', 'ALEX', 'DAO'];
        selectedAsset = assets.find(a =>
          preferredAssets.includes(a.symbol)
        ) || assets[0];
        selectionReason = selectedAsset.symbol ?
          'Preferred token' : 'First available (all zero balance)';
      }
    }

    debugLog('Asset Selection', () => {
      console.log('Selected asset:', safeStringify(selectedAsset));
      console.log('Reason:', selectionReason);
      console.log('Other assets available:', assets.length - 1);
    });

    // Normalize asset structure with full metadata
    const normalizedAsset = {
      id: selectedAsset.id || selectedAsset.asset_id,
      symbol: selectedAsset.symbol || tokenSymbol || 'TOKEN',
      decimals: selectedAsset.decimals || 8,
      balance: selectedAsset.balance,
      name: selectedAsset.name,
      blockchain: selectedAsset.blockchain || 'icp',
      standards: selectedAsset.standards || ['icrc1'],
      // Store selection context for UI
      _selectionReason: selectionReason,
      _otherAssetsCount: assets.length - 1
    };

    // Validate asset has required ID
    if (!normalizedAsset.id) {
      console.error('❌ Asset missing ID:', selectedAsset);
      toast.error('Invalid Asset Data', {
        description: 'Asset is missing required ID. Please refresh the account data.'
      });
      return;
    }

    debugLog('Transfer Dialog Opening', () => {
      console.log('✅ Normalized asset:', safeStringify(normalizedAsset));
      console.log('✅ Validation passed, opening transfer dialog');
    });

    setTransferDialog({
      open: true,
      account,
      asset: normalizedAsset,
      availableAssets: assets  // Pass all assets for potential picker UI
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

  // Helper: Get asset metadata (symbol, name, decimals)
  const getAssetMetadata = useCallback((asset: any, metadataMap: Map<string, any>) => {
    // Try asset's own metadata first
    if (asset.symbol && asset.name) {
      return {
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals ?? 8
      };
    }

    // Lookup from metadata Map (O(1) instead of O(n))
    const metadata = metadataMap.get(asset.asset_id);
    if (metadata) {
      return {
        symbol: metadata.symbol || asset.asset_id?.slice(0, 6) || 'UNKNOWN',
        name: metadata.name || 'Unknown Asset',
        decimals: metadata.decimals ?? 8
      };
    }

    // Fallback
    return {
      symbol: asset.asset_id?.slice(0, 6) || 'UNKNOWN',
      name: 'Unknown Asset',
      decimals: 8
    };
  }, []);

  // Helper: Format individual asset balance
  const formatAssetBalance = useCallback((asset: any, metadata: any): string => {
    const DISPLAY_DECIMAL_PLACES = 2;
    const balance = asset.balance?.balance ?? asset.balance ?? 0n;
    const decimals = asset.balance?.decimals ?? metadata.decimals ?? 8;

    if (typeof balance === 'bigint') {
      const divisor = 10n ** BigInt(decimals);
      const integerPart = balance / divisor;
      const fractionalPart = balance % divisor;
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, DISPLAY_DECIMAL_PLACES);
      return `${integerPart}.${fractionalStr} ${metadata.symbol}`;
    }

    return `0.00 ${metadata.symbol}`;
  }, []);

  // Helper: Get balance status text
  const getBalanceStatus = useCallback((asset: any): string => {
    const queryState = asset.balance?.query_state;

    if (queryState === 'fresh') return '✓ Current';
    if (queryState === 'stale') return '⏱ Updating...';
    if (queryState === 'stale_refreshing') return '🔄 Refreshing...';
    if (!asset.balance) return 'No balance data';

    return 'Unknown status';
  }, []);

  // Helper: Calculate portfolio value for main row
  const getPortfolioValue = useCallback((account: any, metadataMap: Map<string, any>) => {
    const assets = account.assets || [];

    if (assets.length === 0) {
      return <span className="text-muted-foreground">No assets</span>;
    }

    if (assets.length === 1) {
      const asset = assets[0];
      const metadata = getAssetMetadata(asset, metadataMap);
      return formatAssetBalance(asset, metadata);
    }

    // Multiple assets - show summary
    return (
      <span className="text-muted-foreground">
        Multi-asset portfolio
      </span>
    );
  }, [getAssetMetadata, formatAssetBalance]);

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
                    <TableHead>Account</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead className="text-right">Portfolio Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                    accounts.map((account) => {
                      const isExpanded = expandedAccounts.has(account.id);
                      const assetCount = account.assets?.length || 0;

                      return (
                        <React.Fragment key={account.id}>
                          {/* Main row - clickable */}
                          <TableRow
                            onClick={() => toggleExpand(account.id)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            data-testid="treasury-account"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span>{account.name || 'Unnamed Account'}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant="secondary">
                                {assetCount} {assetCount === 1 ? 'asset' : 'assets'}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right font-mono">
                              {getPortfolioValue(account, assetMetadataMap)}
                            </TableCell>

                            <TableCell className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Don't trigger row expansion
                                        handleTransfer(account);
                                      }}
                                      disabled={!identity}
                                    >
                                      <ArrowUpRight className="w-4 h-4 mr-2" />
                                      Transfer
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {!identity ? (
                                      <p>Login with Internet Identity to create transfer proposals</p>
                                    ) : loadingVotingPower ? (
                                      <p>Loading voting power...</p>
                                    ) : votingPower < 10000 ? (
                                      <p>
                                        Need {(10000 - votingPower).toLocaleString()} more VP to propose transfers
                                        <br />
                                        <span className="text-xs text-muted-foreground">
                                          Current: {votingPower.toLocaleString()} VP / Required: 10,000 VP
                                        </span>
                                      </p>
                                    ) : (
                                      <p>Create a transfer proposal (requires community vote)</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>

                          {/* Expanded asset details */}
                          {isExpanded && account.assets && account.assets.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="bg-muted/30 p-0">
                                <div className="p-4 space-y-2">
                                  <div className="text-sm font-medium text-muted-foreground mb-3">
                                    Asset Breakdown
                                  </div>
                                  {account.assets.map((asset) => {
                                    const metadata = getAssetMetadata(asset, assetMetadataMap);
                                    return (
                                      <div
                                        key={asset.asset_id}
                                        className="flex items-center justify-between py-2 px-3 rounded-md bg-background border"
                                        data-testid="asset-detail-row"
                                      >
                                        <div className="flex items-center gap-3">
                                          {/* Asset icon */}
                                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-xs font-semibold">
                                              {(metadata.symbol.charAt(0) || '?').toUpperCase()}
                                            </span>
                                          </div>

                                          {/* Asset name/symbol */}
                                          <div>
                                            <div className="font-medium" data-testid="asset-symbol">
                                              {metadata.symbol}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {metadata.name}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Balance */}
                                        <div className="text-right">
                                          <div className="font-mono" data-testid="asset-balance">
                                            {formatAssetBalance(asset, metadata)}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {getBalanceStatus(asset)}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
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
