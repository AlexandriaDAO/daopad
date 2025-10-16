import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import RequestCard from './RequestCard';

export function RequestList({
  requests = [],
  loading = false,
  tokenId,
  userVotingPower = 0,
  onVote,
  emptyMessage = "No requests found"
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requests.length) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          tokenId={tokenId}
          userVotingPower={userVotingPower}
          onVote={onVote}
        />
      ))}
    </div>
  );
}