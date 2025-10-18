import React from 'react';
import { Badge } from '@/components/ui/badge';

export function VoteProgressBar({ proposal, threshold = 50 }) {
  // Calculate percentages
  const totalVP = Number(proposal.total_voting_power || 0);
  const yesVotes = Number(proposal.yes_votes || 0);
  const noVotes = Number(proposal.no_votes || 0);
  const requiredVotes = (totalVP * threshold) / 100;

  const yesPercent = totalVP > 0 ? (yesVotes / totalVP) * 100 : 0;
  const noPercent = totalVP > 0 ? (noVotes / totalVP) * 100 : 0;

  // Execution status
  const willExecute = yesVotes >= requiredVotes;
  const willReject = noVotes >= (totalVP - requiredVotes);

  return (
    <div className="space-y-2">
      {/* Vote counts */}
      <div className="flex justify-between text-sm">
        <div className="flex gap-4">
          <span className="text-green-600">
            Yes: {yesVotes.toLocaleString()} ({yesPercent.toFixed(1)}%)
          </span>
          <span className="text-red-600">
            No: {noVotes.toLocaleString()} ({noPercent.toFixed(1)}%)
          </span>
        </div>
        <span className="text-muted-foreground">
          Required: {requiredVotes.toLocaleString()} ({threshold}%)
        </span>
      </div>

      {/* Dual progress bars (yes and no) */}
      <div className="space-y-1">
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-green-500 transition-all"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-red-500 transition-all"
            style={{ width: `${noPercent}%` }}
          />
        </div>
      </div>

      {/* Execution prediction */}
      {willExecute && (
        <Badge variant="success" className="text-xs bg-green-100 text-green-800">
          ✓ Will execute automatically
        </Badge>
      )}
      {willReject && (
        <Badge variant="destructive" className="text-xs">
          ✗ Will be rejected
        </Badge>
      )}

      {/* Voter participation */}
      <div className="text-xs text-muted-foreground">
        {Number(proposal.voter_count || 0)} voters participated
      </div>
    </div>
  );
}

export default VoteProgressBar;
