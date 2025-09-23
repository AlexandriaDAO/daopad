import React, { useState, useEffect, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { DAOPadBackendService } from '../../services/daopadBackend';
import RequestDomainTabs from './RequestDomainTabs';
import RequestList from './RequestList';
import RequestFilters from './RequestFilters';
import { REQUEST_DOMAIN_FILTERS, RequestDomains } from '../../utils/requestDomains';

const UnifiedRequests = ({ tokenId, identity }) => {
  // State management
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(RequestDomains.All);
  const [filters, setFilters] = useState({
    statuses: ['Created', 'Approved', 'Processing', 'Scheduled'],
    created_from: null,
    created_to: null,
    expiration_from: null,
    expiration_to: null,
    sort_by: { field: 'ExpirationDt', direction: 'Asc' },  // Earliest expiration first
    only_approvable: false,
    page: 0,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 0,
    hasMore: false
  });

  const { toast } = useToast();

  // Polling interval - 5 seconds like Orbit
  const REFRESH_INTERVAL = 5000;

  // Fetch requests from backend (which proxies to Orbit Station)
  const fetchRequests = useCallback(async () => {
    if (!tokenId || !identity) return;

    try {
      setLoading(true);
      setError(null);

      // Use backend proxy - it already works!
      const backend = new DAOPadBackendService(identity);
      const actor = await backend.getActor();

      // Get domain filters
      const domainFilter = REQUEST_DOMAIN_FILTERS[selectedDomain];

      // Prepare ListRequestsInput for backend
      const statusVariants = filters.statuses.map((status) => ({ [status]: null }));

      const listRequestsInput = {
        statuses: statusVariants.length > 0 ? [statusVariants] : [],
        created_from_dt: filters.created_from ? [filters.created_from.toISOString()] : [],
        created_to_dt: filters.created_to ? [filters.created_to.toISOString()] : [],
        expiration_from_dt: filters.expiration_from ? [filters.expiration_from.toISOString()] : [],
        expiration_to_dt: filters.expiration_to ? [filters.expiration_to.toISOString()] : [],
        operation_types: domainFilter.types.length > 0 ? [domainFilter.types] : [],
        requester_ids: [],
        approver_ids: [],
        paginate: [{
          limit: [filters.limit],
          offset: filters.page > 0 ? [BigInt(filters.page * filters.limit)] : []
        }],
        sort_by: filters.sort_by ? [{
          [filters.sort_by.field]: filters.sort_by.direction === 'Asc' ? { Asc: null } : { Desc: null }
        }] : [],
        only_approvable: filters.only_approvable,
        with_evaluation_results: false,
        deduplication_keys: [],
        tags: []
      };

      // Call backend's list_orbit_requests method
      const result = await actor.list_orbit_requests(
        Principal.fromText(tokenId),
        listRequestsInput
      );

      if ('Ok' in result) {
        const response = result.Ok;
        // Backend already returns properly formatted data
        setRequests(response.requests || []);
        setPagination({
          total: Number(response.total || 0),
          page: filters.page,
          hasMore: response.next_offset && response.next_offset.length > 0,
        });
      } else {
        throw new Error(result.Err || 'Failed to fetch requests');
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError(err.message || 'Failed to load requests');
      toast.error("Failed to load requests from Orbit Station");
    } finally {
      setLoading(false);
    }
  }, [tokenId, identity, selectedDomain, filters, toast]);

  // Handle approval/rejection
  const handleApprovalDecision = async (requestId, decision, reason) => {
    if (!identity) return;

    try {
      const backend = new DAOPadBackendService(identity);
      const actor = await backend.getActor();
      const result = await actor.submit_request_approval(
        Principal.fromText(tokenId),
        requestId,
        { [decision]: null },  // 'Approved' or 'Rejected'
        reason ? [reason] : []
      );

      if (result.success) {
        toast.success(`Request ${decision.toLowerCase()} successfully`);
        // Refresh list
        await fetchRequests();
      } else {
        throw new Error(result.error || 'Orbit Station error');
      }
    } catch (err) {
      toast.error(err.message || `Failed to ${decision.toLowerCase()} request`);
    }
  };

  // Set up polling
  useEffect(() => {
    fetchRequests();

    const interval = setInterval(fetchRequests, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchRequests]);

  // Handle domain change
  const handleDomainChange = (domain) => {
    setSelectedDomain(domain);
    setFilters(prev => ({ ...prev, page: 0 }));  // Reset pagination
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 0  // Reset pagination on filter change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Orbit Station Requests</span>
          <Badge variant="secondary">
            {pagination.total} total
          </Badge>
        </CardTitle>
        <CardDescription>
          Manage proposals and requests for your DAO treasury
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Domain tabs for filtering */}
        <RequestDomainTabs
          selectedDomain={selectedDomain}
          onDomainChange={handleDomainChange}
          requestCounts={getRequestCountsByDomain(requests)}
        />

        {/* Main content area */}
        <div className="flex gap-6">
          {/* Request list */}
          <div className="flex-1">
            <RequestList
              requests={requests}
              loading={loading}
              error={error}
              onApprove={(id) => handleApprovalDecision(id, 'Approved', null)}
              onReject={(id, reason) => handleApprovalDecision(id, 'Rejected', reason)}
              onRetry={fetchRequests}
            />

            {/* Pagination */}
            {!loading && requests.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 0}
                >
                  Previous
                </Button>
                <span className="mx-4 flex items-center">
                  Page {filters.page + 1} of {Math.ceil(pagination.total / filters.limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={!pagination.hasMore}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* Filters sidebar */}
          <div className="w-80">
            <RequestFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to count requests by domain
function getRequestCountsByDomain(requests) {
  const counts = {};
  Object.values(RequestDomains).forEach(domain => {
    counts[domain] = 0;
  });

  // Count would be based on operation types
  // Implementation depends on how operations are parsed
  counts[RequestDomains.All] = requests.length;

  return counts;
}

export default UnifiedRequests;
