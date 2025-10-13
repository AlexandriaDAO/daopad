import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DataTable } from '@/components/ui/data-table';
import { Progress } from '@/components/ui/progress';
import {
  Wallet,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Coins,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { formatBalance } from '@/utils/format';
import { cn } from '@/lib/utils';

export function TreasuryOverview({ assets, loading, onTransfer, onViewAccount }) {
  const [expandedAssets, setExpandedAssets] = useState([]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Wallet className="w-12 h-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              No assets in treasury
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total value
  const totalValue = assets.reduce((sum, asset) => {
    return sum + (Number(asset.totalBalance || 0) * Number(asset.price || 0));
  }, 0);

  // Sort assets by value
  const sortedAssets = [...assets].sort((a, b) => {
    const aValue = Number(a.totalBalance || 0) * Number(a.price || 0);
    const bValue = Number(b.totalBalance || 0) * Number(b.price || 0);
    return bValue - aValue;
  });

  const accountColumns = [
    {
      header: 'Account',
      accessorFn: (row) => row.account.name,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{row.original.account.name}</span>
        </div>
      )
    },
    {
      header: 'Balance',
      accessorFn: (row) => row.balance,
      cell: ({ row }) => {
        const asset = sortedAssets.find(a =>
          a.accountAssets?.some(aa => aa.account.id === row.original.account.id)
        );
        return (
          <div className="text-right font-mono">
            {formatBalance(row.original.balance, asset?.decimals || 8)}
          </div>
        );
      }
    },
    {
      header: 'Value',
      accessorFn: (row) => row.value,
      cell: ({ row }) => {
        const asset = sortedAssets.find(a =>
          a.accountAssets?.some(aa => aa.account.id === row.original.account.id)
        );
        const value = Number(row.original.balance || 0) * Number(asset?.price || 0);
        return (
          <div className="text-right">
            ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => {
        const asset = sortedAssets.find(a =>
          a.accountAssets?.some(aa => aa.account.id === row.original.account.id)
        );
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTransfer(row.original.account, asset)}
              disabled={!row.original.canTransfer}
            >
              <ArrowUpRight className="w-4 h-4" />
              Transfer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewAccount(row.original.account)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Treasury Summary</span>
            <Badge variant="outline" className="text-sm">
              {assets.length} Assets
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                ${totalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Assets</p>
              <p className="text-2xl font-bold">
                {assets.filter(a => Number(a.totalBalance) > 0).length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Accounts</p>
              <p className="text-2xl font-bold">
                {assets.reduce((sum, a) => sum + (a.accountAssets?.length || 0), 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            value={expandedAssets}
            onValueChange={setExpandedAssets}
            className="w-full"
          >
            {sortedAssets.map((asset) => {
              const assetValue = Number(asset.totalBalance || 0) * Number(asset.price || 0);
              const valuePercentage = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;
              const priceChange = asset.priceChange24h || 0;

              return (
                <AccordionItem key={asset.id} value={asset.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{asset.symbol}</span>
                            <Badge variant="outline" className="text-xs">
                              {asset.standard}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {asset.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-mono text-sm">
                            {formatBalance(asset.totalBalance, asset.decimals)} {asset.symbol}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${assetValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Progress value={valuePercentage} className="w-20 h-2" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {valuePercentage.toFixed(1)}%
                          </span>
                        </div>

                        {priceChange !== 0 && (
                          <div className={cn(
                            "flex items-center gap-1",
                            priceChange > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {priceChange > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span className="text-xs font-medium">
                              {Math.abs(priceChange).toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent>
                    {asset.accountAssets && asset.accountAssets.length > 0 ? (
                      <div className="pt-4">
                        <DataTable
                          columns={accountColumns}
                          data={asset.accountAssets}
                          className="border-0"
                        />
                      </div>
                    ) : (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No accounts hold this asset
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Portfolio Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedAssets.slice(0, 5).map((asset) => {
              const assetValue = Number(asset.totalBalance || 0) * Number(asset.price || 0);
              const percentage = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;

              return (
                <div key={asset.id} className="flex items-center gap-3">
                  <div className="w-16 text-right">
                    <Badge variant="secondary" className="text-xs">
                      {asset.symbol}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-6" />
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-medium">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-28 text-right">
                    <span className="text-sm text-muted-foreground">
                      ${assetValue.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {sortedAssets.length > 5 && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-16 text-right">
                  <Badge variant="outline" className="text-xs">
                    Other
                  </Badge>
                </div>
                <div className="flex-1">
                  <Progress
                    value={
                      sortedAssets.slice(5).reduce((sum, asset) => {
                        const assetValue = Number(asset.totalBalance || 0) * Number(asset.price || 0);
                        return sum + (totalValue > 0 ? (assetValue / totalValue) * 100 : 0);
                      }, 0)
                    }
                    className="h-6"
                  />
                </div>
                <div className="w-20 text-right">
                  <span className="text-sm">
                    {sortedAssets.length - 5} more
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}