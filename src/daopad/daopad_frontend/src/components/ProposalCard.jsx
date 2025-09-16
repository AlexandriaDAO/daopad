import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const getStatusColor = (status) => {
  if (typeof status === 'object') {
    const key = Object.keys(status)[0];
    switch(key) {
      case 'Created': return '#007bff';
      case 'Approved': return '#28a745';
      case 'Rejected': return '#dc3545';
      case 'Completed': return '#28a745';
      case 'Failed': return '#dc3545';
      case 'Cancelled': return '#6c757d';
      case 'Scheduled': return '#ffc107';
      case 'Processing': return '#17a2b8';
      default: return '#6c757d';
    }
  }
  return '#6c757d';
};

const getStatusText = (status) => {
  if (typeof status === 'object') {
    return Object.keys(status)[0];
  }
  return 'Unknown';
};

const ProposalCard = ({ proposal, onClick, onApprove, onReject, canVote, isVotingLoading }) => {
  const approvals = proposal.approvals || [];
  const approvalProgress = 0; // We'll calculate this based on policy rules if available

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{proposal.title || 'Untitled Proposal'}</CardTitle>
          <Badge
            variant="outline"
            style={{ backgroundColor: getStatusColor(proposal.status), color: 'white' }}
          >
            {getStatusText(proposal.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">ID:</span>
          <span className="font-mono">{proposal.id?.substring(0, 8) || 'N/A'}...</span>
        </div>

        {proposal.summary && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Summary:</span>
            <span className="text-right max-w-xs truncate">{proposal.summary}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Created:</span>
          <span className="font-mono">{formatDate(proposal.created_at)}</span>
        </div>

        {proposal.expiration_dt && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Expires:</span>
            <span className="font-mono">{formatDate(proposal.expiration_dt)}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Approvals:</span>
            <span className="font-mono">{approvals.length}</span>
          </div>
          {approvals.length > 0 && (
            <div className="flex gap-1">
              {approvals.slice(0, 3).map((approval, idx) => (
                <Badge key={idx} variant={approval.status?.Approved ? 'default' : 'destructive'} className="w-6 h-6 p-0 flex items-center justify-center">
                  {approval.status?.Approved ? '✓' : '✗'}
                </Badge>
              ))}
              {approvals.length > 3 && <Badge variant="secondary">+{approvals.length - 3}</Badge>}
            </div>
          )}
        </div>

        {canVote && getStatusText(proposal.status) === 'Created' && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant={isVotingLoading === 'approved' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onApprove(proposal.id);
              }}
              disabled={isVotingLoading}
            >
              {isVotingLoading === 'approving' ? '⏳ Approving...' :
               isVotingLoading === 'approved' ? '✅ Approved!' : '✓ Approve'}
            </Button>
            <Button
              variant={isVotingLoading === 'rejected' ? 'destructive' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onReject(proposal.id, 'Rejected by DAO vote');
              }}
              disabled={isVotingLoading}
            >
              {isVotingLoading === 'rejecting' ? '⏳ Rejecting...' :
               isVotingLoading === 'rejected' ? '✅ Rejected!' : '✗ Reject'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProposalCard;