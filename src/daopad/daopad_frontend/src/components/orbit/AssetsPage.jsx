import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, ChevronRight, RefreshCw, Search } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useStationService } from '@/hooks/useStationService';
import { useActiveStation } from '@/hooks/useActiveStation';
import AssetDialog from './AssetDialog';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function AssetsPage() {
  const { toast } = useToast();
  const { stationId, token, status: stationStatus } = useActiveStation();
  const station = useStationService();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [dialogMode, setDialogMode] = useState('create'); // create, view, edit

  const debouncedSearch = useDebounce(searchQuery, 300);
  const pagination = usePagination({ pageSize: 20 });

  // Local state (replacing React Query)
  const [assetsData, setAssetsData] = useState({ assets: [], total: 0, privileges: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch assets data
  const fetchAssets = useCallback(async () => {
    if (!stationId || stationStatus !== 'connected') {
      setAssetsData({ assets: [], total: 0, privileges: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await station.listAssets({
        offset: pagination.offset,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
      });

      setAssetsData(response);
      pagination.setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError(err.message || 'Failed to fetch assets');
    } finally {
      setIsLoading(false);
    }
  }, [stationId, stationStatus, station, pagination.offset, pagination.limit, debouncedSearch]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAssets();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAssets]);

  const assets = assetsData?.assets || [];
  const privileges = assetsData?.privileges || [];

  // Check user privileges
  const canAddAsset = privileges.includes('AddAsset');
  const canEditAsset = (assetId) => privileges.includes(`EditAsset:${assetId}`);
  const canDeleteAsset = (assetId) => privileges.includes(`RemoveAsset:${assetId}`);

  const handleCreateAsset = () => {
    setSelectedAsset(null);
    setDialogMode('create');
    setIsAssetDialogOpen(true);
  };

  const handleViewAsset = (asset) => {
    setSelectedAsset(asset);
    setDialogMode('view');
    setIsAssetDialogOpen(true);
  };

  const handleEditAsset = (asset) => {
    setSelectedAsset(asset);
    setDialogMode('edit');
    setIsAssetDialogOpen(true);
  };

  const handleDeleteAsset = async (asset) => {
    try {
      await station.removeAsset({ asset_id: asset.id });
      toast({
        title: 'Asset Removed',
        description: `${asset.symbol} has been removed successfully.`,
      });
      fetchAssets(); // Refresh data
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to Remove Asset',
        description: err.message || 'An error occurred while removing the asset.',
      });
    }
  };

  const handleAssetSaved = () => {
    fetchAssets(); // Refresh data
    setIsAssetDialogOpen(false);
    toast({
      title: dialogMode === 'create' ? 'Asset Created' : 'Asset Updated',
      description: dialogMode === 'create'
        ? 'New asset has been created successfully.'
        : 'Asset has been updated successfully.',
    });
  };

  const getBlockchainBadgeColor = (blockchain) => {
    const colors = {
      'InternetComputer': 'bg-purple-100 text-purple-800',
      'Ethereum': 'bg-blue-100 text-blue-800',
      'Bitcoin': 'bg-orange-100 text-orange-800',
    };
    return colors[blockchain] || 'bg-gray-100 text-gray-800';
  };

  if (!stationId || stationStatus !== 'connected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assets Management</CardTitle>
          <CardDescription>
            Please select a token with an Orbit Station to manage assets
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assets</h2>
          <p className="text-muted-foreground">
            Manage your treasury assets and tokens
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAssets()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canAddAsset && (
            <Button onClick={handleCreateAsset}>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Blockchain</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Decimals</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {debouncedSearch
                      ? 'No assets found matching your search'
                      : 'No assets configured yet'}
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewAsset(asset)}
                  >
                    <TableCell className="font-medium">
                      {asset.symbol}
                    </TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>
                      <Badge className={getBlockchainBadgeColor(asset.blockchain)}>
                        {asset.blockchain}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {asset.standards?.map(s => (
                        <Badge key={s} variant="outline" className="mr-1">
                          {s}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>{asset.decimals}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewAsset(asset)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {canEditAsset(asset.id) && (
                            <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Asset
                            </DropdownMenuItem>
                          )}
                          {canDeleteAsset(asset.id) && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteAsset(asset)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Asset
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {assets.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, assetsData?.total || 0)} of {assetsData?.total || 0} assets
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.previousPage}
              disabled={!pagination.hasPreviousPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.nextPage}
              disabled={!pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Asset Dialog */}
      <AssetDialog
        open={isAssetDialogOpen}
        onOpenChange={setIsAssetDialogOpen}
        asset={selectedAsset}
        mode={dialogMode}
        onSaved={handleAssetSaved}
      />
    </div>
  );
}
