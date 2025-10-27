import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Principal } from '@dfinity/principal';
import {
  Card,
  CardContent
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { getProposalService } from '../../services/backend';
import { useVoting } from '../../hooks/useVoting';
import RequestDomainSelector from './RequestDomainSelector';
import { RequestList } from './requests/RequestList';
import RequestFiltersCompact from './RequestFiltersCompact';
import RequestStatusFilter from './RequestStatusFilter';
import { REQUEST_DOMAIN_FILTERS, RequestDomains } from '../../utils/requestDomains';

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
    sort_by: null,  // Temporarily disabled - fixing Candid encoding issue
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

  const { toast } = useToast();

  // Voting system integration
  const { vote, userVotingPower, fetchVotingPower } = useVoting(tokenId);

  // Fetch requests from backend (which proxies to Orbit Station)
  const fetchRequests = useCallback(async () => {
    console.log('[UnifiedRequests] fetchRequests called', {
      tokenId,
      hasIdentity: !!identity,
      selectedDomain,
      filtersPage: filters.page,
      filterStatuses: filters.statuses
    });

    if (!tokenId) return; // ✅ Allow anonymous viewing - identity only required for voting

    try {
      setLoading(true);
      setError(null);

      // Use backend proxy - it already works!
      // Identity is optional - null for anonymous viewing, required for voting
      const backend = getProposalService(identity || null);
      const actor = await backend.getActor();

      // Get domain filters
      const domainFilter = REQUEST_DOMAIN_FILTERS[selectedDomain];

      // Prepare ListRequestsInput for backend
      // Use filters.statuses directly - user controls which statuses to show
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
        sort_by: null,  // Backend expects null type, not optional
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
        // Convert BigInt values to numbers for display
        let allRequests = (response.requests || []).map(request => ({
          ...request,
          yes_votes: typeof request.yes_votes === 'bigint' ? Number(request.yes_votes) : request.yes_votes,
          no_votes: typeof request.no_votes === 'bigint' ? Number(request.no_votes) : request.no_votes,
          total_voting_power: typeof request.total_voting_power === 'bigint' ? Number(request.total_voting_power) : request.total_voting_power,
          created_at: typeof request.created_at === 'bigint' ? Number(request.created_at) : request.created_at,
          expires_at: typeof request.expires_at === 'bigint' ? Number(request.expires_at) : request.expires_at,
        }));

        // ✅ REMOVED: Treasury proposal fetch - unified requests already include treasury operations
        // No separate fetch needed - list_requests returns all operation types including Transfer

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
  }, [tokenId, identity, selectedDomain, filters]); // Removed toast from dependencies

  // ✅ UPDATED: Active voting replaces direct approval
  const handleVote = async (orbitRequestId, voteChoice) => {
    try {
      await vote(orbitRequestId, voteChoice);
      // Refresh requests to show updated vote counts
      await fetchRequests();
    } catch (error) {
      // Improved structured error logging
      console.error('[UnifiedRequests] Vote error:', {
        error: error,
        code: error.code || 'UNKNOWN',
        message: error.message || error.toString(),
        canRetry: error.canRetry || false,
        requestId: orbitRequestId,
        vote: voteChoice,
        timestamp: new Date().toISOString()
      });

      // User-friendly error handling based on error type
      if (error.code === 'SERVICE_UNAVAILABLE') {
        setError('Kong Locker service is down. Retrying...');
        // Auto-retry for service unavailable errors
        setTimeout(() => {
          handleVote(orbitRequestId, voteChoice);
        }, 3000);
      } else if (error.message && !error.code) {
        // For non-structured errors, show the message
        setError(error.message);
      }
      // Structured errors are handled by VoteButtons component
    }
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
      const backend = getProposalService(identity);
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

  // Initial fetch on mount
  useEffect(() => {
    console.log('[UnifiedRequests] Initial mount - fetching requests');
    fetchRequests();
  }, [fetchRequests]);

  // Fetch when filters change
  useEffect(() => {
    console.log('[UnifiedRequests] Filters changed - fetching requests');
    fetchRequests();
  }, [selectedDomain, filters.page, fetchRequests]);

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

  // Handle status filter changes
  const handleStatusChange = (newStatuses) => {
    setFilters(prev => ({
      ...prev,
      statuses: newStatuses,
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
            <RequestStatusFilter
              selectedStatuses={filters.statuses}
              onChange={handleStatusChange}
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

        {/* Stats bar with quick filter tabs */}
        <div className="flex justify-between items-center py-2 border-y">
          <div className="flex gap-4 items-center">
            {/* Stats - contextual based on current filter */}
            <div className="text-sm">
              <span className="font-semibold">{requests.length}</span>
              <span className="text-muted-foreground"> showing</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">{pagination.total}</span>
              <span className="text-muted-foreground"> total in filter</span>
            </div>

            {/* Quick filter tabs with active state */}
            <div className="flex gap-1 ml-4 border rounded-md p-1">
              <Button
                variant={
                  JSON.stringify(filters.statuses.sort()) === JSON.stringify(['Created', 'Scheduled'].sort())
                    ? 'default'
                    : 'ghost'
                }
                size="sm"
                onClick={() => handleStatusChange(['Created', 'Scheduled'])}
              >
                Pending Only
              </Button>
              <Button
                variant={
                  JSON.stringify(filters.statuses.sort()) === JSON.stringify(['Cancelled', 'Completed', 'Failed', 'Rejected'].sort())
                    ? 'default'
                    : 'ghost'
                }
                size="sm"
                onClick={() => handleStatusChange(['Completed', 'Rejected', 'Cancelled', 'Failed'])}
              >
                Resolved Only
              </Button>
            </div>
          </div>
        </div>

        {/* Request list with voting UI */}
        <RequestList
          requests={requests}
          loading={loading}
          tokenId={tokenId}
          userVotingPower={userVotingPower}
          onVote={handleVote}
          emptyMessage="No requests found"
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
