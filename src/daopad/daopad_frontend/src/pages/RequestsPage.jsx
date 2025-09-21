import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStationService } from '@/hooks/useStationService';
import { useActiveStation } from '@/hooks/useActiveStation';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { PageLayout } from '@/components/orbit/PageLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Download, Filter, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { RequestList } from '@/components/orbit/requests/RequestList';
import { RequestDialog } from '@/components/orbit/requests/RequestDialog';
import { RequestFilters } from '@/components/orbit/requests/RequestFilters';
import { RecentRequests } from '@/components/orbit/RecentRequests';
import { formatDateTime, formatPrincipalShort } from '@/utils/format';
import { useToast } from '@/components/ui/use-toast';

export function RequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeStation, isLoading: stationLoading } = useActiveStation();
  const stationService = useStationService();
  const pagination = usePagination({ pageSize: 25 });

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    operation_type: 'all',
    requester: '',
    date_range: 'all'
  });

  const debouncedSearch = useDebounce(filters.search, 300);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Build filter object for API
  const buildApiFilters = useCallback(() => {
    const apiFilters = {};

    if (debouncedSearch) {
      apiFilters.search = debouncedSearch;
    }

    if (filters.status !== 'all') {
      apiFilters.status = filters.status;
    }

    if (filters.operation_type !== 'all') {
      apiFilters.operation_type = filters.operation_type;
    }

    if (filters.requester) {
      apiFilters.requester = filters.requester;
    }

    if (filters.date_range !== 'all') {
      const now = BigInt(Date.now() * 1000000); // Convert to nanoseconds
      const day = BigInt(24 * 60 * 60 * 1000 * 1000000);

      switch(filters.date_range) {
        case 'today':
          apiFilters.created_after = now - day;
          break;
        case 'week':
          apiFilters.created_after = now - (day * BigInt(7));
          break;
        case 'month':
          apiFilters.created_after = now - (day * BigInt(30));
          break;
      }
    }

    return apiFilters;
  }, [debouncedSearch, filters]);

  // Query for requests
  const requestsQuery = useQuery({
    queryKey: ['station', activeStation?.station_id, 'requests', buildApiFilters(), pagination.page],
    queryFn: async () => {
      if (!activeStation?.station_id || !stationService) {
        return { requests: [], total: 0, privileges: [] };
      }

      const result = await stationService.listRequests({
        filter: buildApiFilters(),
        pagination: {
          offset: BigInt(pagination.offset),
          limit: BigInt(pagination.limit)
        }
      });

      return {
        requests: result.requests || [],
        total: Number(result.total || 0),
        privileges: result.privileges || []
      };
    },
    enabled: !!activeStation?.station_id && !!stationService,
    refetchInterval: 5000,
    keepPreviousData: true
  });

  // Update pagination total when data changes
  useEffect(() => {
    if (requestsQuery.data?.total) {
      pagination.setTotal(requestsQuery.data.total);
    }
  }, [requestsQuery.data?.total]);

  // Export to CSV
  const handleExportCsv = useCallback(async () => {
    try {
      const allRequests = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const batch = await stationService.listRequests({
          filter: buildApiFilters(),
          pagination: {
            offset: BigInt(offset),
            limit: BigInt(limit)
          }
        });

        allRequests.push(...(batch.requests || []));
        offset += limit;
        hasMore = batch.requests?.length === limit;
      }

      // Convert to CSV
      const headers = ['ID', 'Title', 'Operation Type', 'Status', 'Requester', 'Created', 'Approvals'];
      const rows = allRequests.map(req => [
        req.id,
        req.title || 'Untitled',
        req.operation_type || 'Unknown',
        req.status,
        formatPrincipalShort(req.requester),
        formatDateTime(req.created_at),
        `${req.approvals?.length || 0}/${req.approval_threshold || 0}`
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `requests-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Exported ${allRequests.length} requests to CSV`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export requests',
        variant: 'destructive'
      });
    }
  }, [stationService, buildApiFilters, toast]);

  // Handle request selection
  const handleOpenRequest = useCallback((request) => {
    setSelectedRequestId(request.id);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedRequestId(null);
  }, []);

  const handleRequestApproved = useCallback(() => {
    queryClient.invalidateQueries(['station', activeStation?.station_id, 'requests']);
    handleCloseDialog();
  }, [queryClient, activeStation, handleCloseDialog]);

  if (!activeStation) {
    return (
      <PageLayout title="Requests">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Please select a token with an Orbit Station to view requests
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const loading = stationLoading || requestsQuery.isLoading;

  return (
    <PageLayout
      title="Requests"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={!requestsQuery.data?.requests?.length}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      }
    >
      <RecentRequests domain="All" />

      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        <div className="space-y-4">
          <RequestList
            requests={requestsQuery.data?.requests || []}
            privileges={requestsQuery.data?.privileges || []}
            loading={loading}
            onOpenRequest={handleOpenRequest}
            emptyMessage={
              filters.search || filters.status !== 'all'
                ? "No requests match your filters"
                : "No requests yet"
            }
          />

          {requestsQuery.data?.total > pagination.pageSize && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.goToPreviousPage}
                disabled={!pagination.hasPreviousPage}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.goToNextPage}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <RequestFilters
            filters={filters}
            onChange={setFilters}
            requestsData={requestsQuery.data}
          />
        </div>
      </div>

      <RequestDialog
        open={dialogOpen}
        requestId={selectedRequestId}
        onClose={handleCloseDialog}
        onApproved={handleRequestApproved}
      />
    </PageLayout>
  );
}