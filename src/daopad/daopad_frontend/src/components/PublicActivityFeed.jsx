import React from 'react';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PublicActivityFeed = () => {
  const proposals = useSelector(state => state.dao.publicDashboard.proposals);
  const isLoading = useSelector(state => state.dao.publicDashboard.isLoading);
  const hasPartialData = useSelector(state => state.dao.publicDashboard.hasPartialData);

  // Simple proposal display component
  const ProposalItem = ({ proposal }) => {
    // Determine status text
    const getStatusText = () => {
      if (proposal.status?.Active !== undefined) return 'Active';
      if (proposal.status?.Approved !== undefined) return 'Approved';
      if (proposal.status?.Rejected !== undefined) return 'Rejected';
      return 'Expired';
    };

    const statusText = getStatusText();
    const statusColor = statusText === 'Active' ? 'bg-executive-gold/20 text-executive-goldLight' :
                       statusText === 'Approved' ? 'bg-green-900/20 text-green-400' :
                       statusText === 'Rejected' ? 'bg-red-900/20 text-red-400' :
                       'bg-gray-800/20 text-gray-400';

    return (
      <div className="p-3 bg-executive-darkGray/30 rounded border border-executive-gold/10">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-mono text-executive-lightGray">
            Token: {proposal.token_canister_id.toString().slice(0, 10)}...
          </span>
          <Badge className={`${statusColor} text-xs border-transparent`}>
            {statusText}
          </Badge>
        </div>
        <div className="flex justify-between text-xs text-executive-lightGray/60">
          <span>Yes: {proposal.yes_votes.toString()}</span>
          <span>No: {proposal.no_votes.toString()}</span>
          <span>Total Power: {proposal.total_voting_power.toString()}</span>
        </div>
        {statusText === 'Active' && (
          <div className="mt-2">
            <div className="h-1 bg-executive-darkGray rounded-full overflow-hidden">
              <div
                className="h-full bg-executive-gold/50 transition-all"
                style={{
                  width: `${(Number(proposal.yes_votes) / Number(proposal.total_voting_power)) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isLoading && proposals.length === 0) {
    return (
      <Card className="border-executive-gold/20">
        <CardHeader>
          <CardTitle className="font-display text-executive-ivory">
            Governance Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-executive-lightGray/60 text-center py-8">
            {hasPartialData
              ? "Unable to load proposals - data may be temporarily unavailable"
              : "No active proposals at the moment"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-executive-gold/20">
      <CardHeader>
        <CardTitle className="font-display text-executive-ivory">
          Active Proposals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposals.slice(0, 5).map(proposal => (
          <ProposalItem key={proposal.id.toString()} proposal={proposal} />
        ))}
        {proposals.length > 5 && (
          <p className="text-sm text-executive-lightGray/60 text-center mt-4">
            And {proposals.length - 5} more proposals...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PublicActivityFeed;