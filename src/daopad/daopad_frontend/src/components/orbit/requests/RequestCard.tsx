import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useProposal } from '@/hooks/useProposal';
import VoteProgressBar from './VoteProgressBar';
import VoteButtons from './VoteButtons';

// Backend needs ~100-500ms to commit votes to storage before they appear in queries
const VOTE_BACKEND_COMMIT_DELAY_MS = 500;

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
  if (request.operation) {
    if (typeof request.operation === 'string') return request.operation;
    if (typeof request.operation === 'object' && request.operation !== null) {
      return Object.keys(request.operation)[0];
    }
  }
  return 'Unknown';
}

export function RequestCard({ request, tokenId, userVotingPower, onVote }) {
  const operationType = getOperationType(request);
  const { proposal, loading, hasVoted, ensureProposal, fetchProposal } = useProposal(
    tokenId,
    request.id,
    operationType
  );

  // Auto-create proposal when card is viewed (only for Created status)
  useEffect(() => {
    if (!proposal && !loading && request.status === 'Created') {
      ensureProposal();
    }
  }, [proposal, loading, request.status, ensureProposal]);

  const statusInfo = statusConfig[request.status] || statusConfig.Created;
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
            <Badge variant={request.status === 'Created' ? 'default' : 'secondary'}>
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
        {request.status === 'Created' && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm">Community Vote</h4>

            {loading && (
              <div className="text-sm text-muted-foreground">
                Loading proposal...
              </div>
            )}

            {!loading && !proposal && (
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
                  hasVoted={hasVoted}
                  disabled={proposal.status && Object.keys(proposal.status)[0] !== 'Active'}
                  onVoteComplete={() => setTimeout(fetchProposal, VOTE_BACKEND_COMMIT_DELAY_MS)}
                />
              </>
            )}
          </div>
        )}

        {/* Show proposal results for completed requests */}
        {request.status !== 'Created' && proposal && (
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
