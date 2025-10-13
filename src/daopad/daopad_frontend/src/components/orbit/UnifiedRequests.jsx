import React, { useState, useEffect, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import {
  Card,
  CardContent
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { DAOPadBackendService } from '../../services/daopadBackend';
import RequestDomainSelector from './RequestDomainSelector';
import RequestList from './RequestList';
import RequestFiltersCompact from './RequestFiltersCompact';
import { REQUEST_DOMAIN_FILTERS, RequestDomains } from '../../utils/requestDomains';
import { Zap, Clock } from 'lucide-react';

const UnifiedRequests = ({ tokenId, identity }) => {
  // State management
  const [requests, setRequests] = useState([]);
  const [treasuryProposal, setTreasuryProposal] = useState(null);
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
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [batchApproving, setBatchApproving] = useState(false);
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const { toast } = useToast();

  // Polling interval - adjusted to 15 seconds for performance
  const REFRESH_INTERVAL = 15000;

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
      // If "Pending only" is enabled, filter to Created and Scheduled statuses
      const activeStatuses = showOnlyPending
        ? ['Created', 'Scheduled']
        : filters.statuses;
      const statusVariants = activeStatuses.map((status) => ({ [status]: null }));

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
        let allRequests = response.requests || [];

        // Also fetch treasury proposal
        try {
          const treasuryResult = await backend.getTreasuryProposal(Principal.fromText(tokenId));
          if (treasuryResult.success && treasuryResult.data) {
            setTreasuryProposal(treasuryResult.data);

            // Extract status from variant object (backend returns { Active: null } not string)
            const statusVariant = treasuryResult.data.status;
            const statusKey = typeof statusVariant === 'object' && statusVariant !== null
              ? Object.keys(statusVariant)[0]
              : statusVariant;

            // Convert proposal to request-like format for display
            const proposalAsRequest = {
              id: treasuryResult.data.orbit_request_id,
              title: `Treasury Transfer Proposal`,
              status: statusKey === 'Active' ? 'Created' : statusKey,
              operation: { Transfer: null },
              created_at: treasuryResult.data.created_at,
              expires_at: treasuryResult.data.expires_at,
              yes_votes: treasuryResult.data.yes_votes,
              no_votes: treasuryResult.data.no_votes,
              total_voting_power: treasuryResult.data.total_voting_power,
              is_treasury_proposal: true,
              proposal_id: treasuryResult.data.id
            };

            // Prepend to requests list
            allRequests = [proposalAsRequest, ...allRequests];
          }
        } catch (err) {
          console.warn('Failed to fetch treasury proposal:', err);
          // Don't fail the whole fetch if treasury proposal fails
        }

        setRequests(allRequests);
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
  }, [tokenId, identity, selectedDomain, filters, showOnlyPending, toast]);

  // ❌ REMOVED: Direct approval/rejection (replaced by liquid democracy voting)
  // TODO: Implement voting UI in follow-up PR
  //  - Show vote Yes/No buttons instead of Approve/Reject
  //  - Display vote progress bars (yes_votes vs total_voting_power)
  //  - Show threshold percentage and current vote counts
  //  - Fetch proposal data alongside requests
  // For now, approval UI is disabled - users cannot approve requests directly
  const handleApprovalDecision = async (requestId, decision, reason) => {
    toast.error('Direct approval is disabled. Liquid democracy voting will be implemented in the next update.');
    return;
  };

  // ❌ REMOVED: Batch approval (replaced by individual voting)
  const handleBatchApprove = async () => {
    toast.error('Batch approval is disabled. Liquid democracy voting will be implemented in the next update.');
    return;
  };

  const toggleRequestSelection = (requestId) => {
    setSelectedRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const selectAllPending = () => {
    const pendingRequests = requests.filter(r =>
      r.status === 'Created' || r.status === 'Scheduled'
    );
    setSelectedRequests(pendingRequests.map(r => r.id));
  };

  const clearSelection = () => setSelectedRequests([]);

  // Handle voting on treasury proposals
  const handleTreasuryVote = async (proposalId, vote) => {
    if (!identity) return;

    try {
      const backend = new DAOPadBackendService(identity);
      const result = await backend.voteOnTreasuryProposal(proposalId, vote);

      if (result.success) {
        toast.success(`Vote ${vote ? 'Yes' : 'No'} recorded`);
        // Refresh requests to get updated vote counts
        await fetchRequests();
      } else {
        throw new Error(result.error || 'Failed to vote');
      }
    } catch (err) {
      toast.error(err.message || `Failed to vote`);
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
    // For Users domain, include Completed status to show executed member operations
    const newStatuses = domain === RequestDomains.Users
      ? ['Created', 'Approved', 'Processing', 'Scheduled', 'Completed']
      : ['Created', 'Approved', 'Processing', 'Scheduled'];
    setFilters(prev => ({
      ...prev,
      page: 0,  // Reset pagination
      statuses: newStatuses
    }));
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
      <CardContent className="pt-6 space-y-4">
        {/* Filter controls and domain selector in compact header */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <RequestDomainSelector
              selectedDomain={selectedDomain}
              onDomainChange={handleDomainChange}
              requestCounts={getRequestCountsByDomain(requests)}
            />
            <RequestFiltersCompact
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {requests.length} of {pagination.total} requests
          </div>
        </div>

        {/* Stats and batch actions bar */}
        <div className="flex justify-between items-center py-2 border-y">
          <div className="flex gap-4 items-center">
            {/* Stats */}
            <div className="text-sm">
              <span className="font-semibold">{pagination.total}</span>
              <span className="text-muted-foreground"> total</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-yellow-600">
                {requests.filter(r => r.status === 'Created' || r.status === 'Scheduled').length}
              </span>
              <span className="text-muted-foreground"> pending</span>
            </div>

            {/* Pending only toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyPending}
                onChange={(e) => setShowOnlyPending(e.target.checked)}
              />
              <span className="text-sm">Pending only</span>
            </label>
          </div>

          {/* Batch actions */}
          <div className="flex gap-2">
            {selectedRequests.length === 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllPending}
                disabled={requests.filter(r => r.status === 'Created' || r.status === 'Scheduled').length === 0}
              >
                Select All Pending
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear ({selectedRequests.length})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBatchApprove}
                  disabled={batchApproving}
                >
                  {batchApproving ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Approve {selectedRequests.length}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Request list - now takes full width */}
        <RequestList
          requests={requests}
          loading={loading}
          error={error}
          onApprove={(id, request) => {
            // Handle treasury proposals differently
            if (request?.is_treasury_proposal) {
              handleTreasuryVote(request.proposal_id, true);
            } else {
              handleApprovalDecision(id, 'Approved', null);
            }
          }}
          onReject={(id, reason, request) => {
            // Handle treasury proposals differently
            if (request?.is_treasury_proposal) {
              handleTreasuryVote(request.proposal_id, false);
            } else {
              handleApprovalDecision(id, 'Rejected', reason);
            }
          }}
          onRetry={fetchRequests}
        />

        {/* Pagination */}
        {!loading && requests.length > 0 && (
          <div className="flex justify-center">
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
