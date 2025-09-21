import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, RefreshCw, Search, Server, Activity, Shield, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useStationService } from '@/hooks/useStationService';
import { useActiveStation } from '@/hooks/useActiveStation';
import { formatAddress } from '@/utils/format';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilter } from '@/hooks/useFilter';
import ExternalCanisterDialog from './ExternalCanisterDialog';

export default function ExternalCanistersPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { stationId, token, status: stationStatus } = useActiveStation();
  const station = useStationService();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCanisterDialogOpen, setIsCanisterDialogOpen] = useState(false);
  const [selectedCanister, setSelectedCanister] = useState(null);
  const [dialogMode, setDialogMode] = useState('create'); // create, view, edit

  const debouncedSearch = useDebounce(searchQuery, 300);
  const pagination = usePagination({ pageSize: 20 });
  const { filters, setFilter, activeFilters } = useFilter({
    status: null,
    permissions: null,
  });

  // Fetch external canisters list
  const {
    data: canistersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['station', stationId, 'external-canisters', pagination.page, debouncedSearch, filters],
    queryFn: async () => {
      if (!stationId) return { canisters: [], total: 0, privileges: [] };

      try {
        const response = await station.listExternalCanisters({
          offset: pagination.offset,
          limit: pagination.limit,
          search: debouncedSearch || undefined,
          filters: activeFilters,
        });

        pagination.setTotal(response.total);
        return response;
      } catch (err) {
        console.error('Failed to fetch external canisters:', err);
        throw err;
      }
    },
    enabled: !!stationId && stationStatus === 'connected',
    refetchInterval: 10000, // Longer interval for canisters
    retry: 1,
  });

  const canisters = canistersData?.canisters || [];
  const privileges = canistersData?.privileges || [];

  // Check user privileges
  const canAddCanister = privileges.includes('AddExternalCanister');
  const canEditCanister = (canisterId) => privileges.includes(`EditExternalCanister:${canisterId}`);
  const canCallCanister = (canisterId) => privileges.includes(`CallExternalCanister:${canisterId}`);

  const handleCreateCanister = () => {
    setSelectedCanister(null);
    setDialogMode('create');
    setIsCanisterDialogOpen(true);
  };

  const handleViewCanister = (canister) => {
    navigate(`/treasury/external-canisters/${canister.canister_id}`);
  };

  const handleEditCanister = (canister) => {
    setSelectedCanister(canister);
    setDialogMode('edit');
    setIsCanisterDialogOpen(true);
  };

  const handleCanisterSaved = () => {
    refetch();
    setIsCanisterDialogOpen(false);
    toast({
      title: dialogMode === 'create' ? 'Canister Registered' : 'Canister Updated',
      description: dialogMode === 'create'
        ? 'External canister has been registered successfully.'
        : 'Canister configuration has been updated.',
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Active': { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      'Inactive': { icon: XCircle, color: 'bg-red-100 text-red-800' },
      'Unknown': { icon: Activity, color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status] || statusConfig['Unknown'];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getPermissionBadges = (permissions) => {
    if (!permissions || permissions.length === 0) {
      return <span className="text-xs text-muted-foreground">No permissions</span>;
    }

    return (
      <div className="flex gap-1 flex-wrap">
        {permissions.slice(0, 2).map(perm => (
          <Badge key={perm} variant="outline" className="text-xs">
            {perm}
          </Badge>
        ))}
        {permissions.length > 2 && (
          <Badge variant="outline" className="text-xs">
            +{permissions.length - 2}
          </Badge>
        )}
      </div>
    );
  };

  if (!stationId || stationStatus !== 'connected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>External Canisters</CardTitle>
          <CardDescription>
            Please select a token with an Orbit Station to manage external canisters
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
          <h2 className="text-3xl font-bold tracking-tight">External Canisters</h2>
          <p className="text-muted-foreground">
            Manage integrations with external canister smart contracts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canAddCanister && (
            <Button onClick={handleCreateCanister}>
              <Plus className="h-4 w-4 mr-2" />
              Register Canister
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or canister ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex gap-2">
              <Button
                variant={filters.status === 'Active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('status', filters.status === 'Active' ? null : 'Active')}
              >
                Active Only
              </Button>
              <Button
                variant={filters.permissions === 'CanCall' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('permissions', filters.permissions === 'CanCall' ? null : 'CanCall')}
              >
                Callable
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Canisters Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canister</TableHead>
                <TableHead>Name / Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : canisters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {debouncedSearch || activeFilters.length > 0
                      ? 'No canisters found matching your criteria'
                      : 'No external canisters registered yet'}
                  </TableCell>
                </TableRow>
              ) : (
                canisters.map((canister) => (
                  <TableRow
                    key={canister.canister_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewCanister(canister)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-mono text-xs">
                            {formatAddress(canister.canister_id, 8)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{canister.name}</div>
                        {canister.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {canister.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(canister.status)}
                    </TableCell>
                    <TableCell>
                      {getPermissionBadges(canister.permissions)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canister.labels?.slice(0, 2).map(label => (
                          <Badge key={label} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canCallCanister(canister.canister_id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/treasury/external-canisters/${canister.canister_id}/call`);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {canEditCanister(canister.canister_id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCanister(canister);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCanister(canister);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {canisters.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, canistersData?.total || 0)} of {canistersData?.total || 0} canisters
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

      {/* External Canister Dialog */}
      <ExternalCanisterDialog
        open={isCanisterDialogOpen}
        onOpenChange={setIsCanisterDialogOpen}
        canister={selectedCanister}
        mode={dialogMode}
        onSaved={handleCanisterSaved}
      />
    </div>
  );
}