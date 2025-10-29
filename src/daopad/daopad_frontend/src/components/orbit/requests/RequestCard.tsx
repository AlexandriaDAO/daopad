import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useProposal } from '@/hooks/useProposal';
import { useAuth } from '@/providers/AuthProvider/IIProvider';
import VoteProgressBar from './VoteProgressBar';
import VoteButtons from './VoteButtons';

const statusConfig = {
  Created: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  Approved: { icon: CheckCircle, color: 'text-green-500', label: 'Approved' },
  Rejected: { icon: XCircle, color: 'text-red-500', label: 'Rejected' },
  Processing: { icon: AlertCircle, color: 'text-blue-500', label: 'Processing' },
  Scheduled: { icon: Clock, color: 'text-purple-500', label: 'Scheduled' },
  Completed: { icon: CheckCircle, color: 'text-green-600', label: 'Completed' },
  Failed: { icon: XCircle, color: 'text-red-600', label: 'Failed' },
  Cancelled: { icon: XCircle, color: 'text-gray-500', label: 'Cancelled' }
};

// Extract operation type from request object
function getOperationType(request) {
  console.log('[getOperationType] Request:', request);

  // Check if operation is an array (from backend)
  if (request.operation && Array.isArray(request.operation) && request.operation.length > 0) {
    const op = request.operation[0];
    if (typeof op === 'string') return op;
    if (typeof op === 'object' && op !== null) {
      return Object.keys(op)[0];
    }
  }

  // Check multiple possible locations for operation type
  if (request.operation) {
    if (typeof request.operation === 'string') return request.operation;
    if (typeof request.operation === 'object' && request.operation !== null) {
      return Object.keys(request.operation)[0];
    }
  }

  // Check if it's in operation_type field (from backend)
  if (request.operation_type) {
    if (typeof request.operation_type === 'string') return request.operation_type;
    if (typeof request.operation_type === 'object' && request.operation_type !== null) {
      return Object.keys(request.operation_type)[0];
    }
  }

  // Check if it's nested in the request structure
  if (request.request && request.request.operation) {
    if (typeof request.request.operation === 'string') return request.request.operation;
    if (typeof request.request.operation === 'object' && request.request.operation !== null) {
      return Object.keys(request.request.operation)[0];
    }
  }

  return 'Unknown';
}

export function RequestCard({ request, tokenId, userVotingPower, onVote }) {
  const operationType = getOperationType(request);
  const { login } = useAuth();
  const { proposal, loading, hasVoted, userVote, isAuthenticated, ensureProposal, fetchProposal } = useProposal(
    tokenId,
    request.id,
    operationType
  );

  // Auto-create proposal when card is viewed (only for Created status and authenticated users)
  useEffect(() => {
    // Extract status from variant if needed (backend returns { Created: null })
    const statusValue = typeof request.status === 'object' && request.status !== null
      ? Object.keys(request.status)[0]
      : request.status;

    console.log('[RequestCard] Proposal check:', {
      requestId: request.id,
      status: statusValue,
      hasProposal: !!proposal,
      loading,
      isAuthenticated,
      operationType
    });

    // Only auto-create if user is authenticated
    if (!proposal && !loading && (statusValue === 'Created' || statusValue === 'Scheduled') && isAuthenticated) {
      console.log('[RequestCard] Creating proposal for authenticated user:', request.id);
      ensureProposal();
    }
  }, [proposal, loading, request.status, isAuthenticated, ensureProposal]);

  // Extract status from variant if needed
  const statusValue = typeof request.status === 'object' && request.status !== null
    ? Object.keys(request.status)[0]
    : request.status;

  const statusInfo = statusConfig[statusValue] || statusConfig.Created;
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
              {request.title || `Request #${request.id}`}
            </CardTitle>
            {request.summary && (
              <p className="text-sm text-muted-foreground mt-1">{request.summary}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{operationType}</Badge>
            <Badge variant={statusValue === 'Created' ? 'default' : 'secondary'}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Request metadata */}
        <div className="text-xs text-muted-foreground mb-3">
          <div>ID: {request.id}</div>
          {request.requester_name && <div>Requester: {request.requester_name}</div>}
        </div>

        {/* Voting section - only for Created status requests */}
        {(statusValue === 'Created' || statusValue === 'Scheduled') && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm">Community Vote</h4>

            {loading && (
              <div className="text-sm text-muted-foreground">
                Loading proposal...
              </div>
            )}

            {/* Show login prompt for unauthenticated users */}
            {!loading && !isAuthenticated && (
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">
                  Log in to vote on this request
                </p>
                <button
                  onClick={login}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  Log In to Vote
                </button>
              </div>
            )}

            {/* Only show "creating" message when authenticated */}
            {!loading && !proposal && isAuthenticated && (
              <div className="text-sm text-muted-foreground">
                Creating proposal for community vote...
              </div>
            )}

            {proposal && (
              <>
                {/* Vote progress */}
                <VoteProgressBar
                  proposal={proposal}
                  threshold={50} // Simplified: 50% for all
                />

                {/* Vote buttons */}
                <VoteButtons
                  proposalId={Number(proposal.id)}
                  orbitRequestId={request.id}
                  tokenId={tokenId}
                  onVote={onVote}
                  userVotingPower={userVotingPower}
                  hasVoted={hasVoted} // From backend now
                  userVote={userVote} // NEW: Pass actual vote
                  disabled={proposal.status && Object.keys(proposal.status)[0] !== 'Active'}
                  onVoteComplete={fetchProposal}
                />
              </>
            )}
          </div>
        )}

        {/* Show proposal results for completed requests */}
        {statusValue !== 'Created' && statusValue !== 'Scheduled' && proposal && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <h4 className="font-medium text-sm">Final Vote Results</h4>
            <VoteProgressBar
              proposal={proposal}
              threshold={50}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RequestCard;
