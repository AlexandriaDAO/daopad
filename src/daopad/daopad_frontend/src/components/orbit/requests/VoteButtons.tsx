import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function VoteButtons({
  proposalId,
  orbitRequestId,
  tokenId,
  onVote,
  disabled,
  userVotingPower,
  hasVoted,
  onVoteComplete
}) {
  const [voting, setVoting] = useState(null); // 'yes' | 'no' | null
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted);

  const handleVote = async (vote) => {
    setVoting(vote ? 'yes' : 'no');

    try {
      // onVote now returns updated proposal data
      const result = await onVote(orbitRequestId, vote);
      toast.success(`${vote ? "Voted Yes" : "Voted No"} - Your voting power: ${userVotingPower.toLocaleString()}`);
      setLocalHasVoted(true);

      // Pass updated proposal data to onVoteComplete
      if (onVoteComplete) {
        onVoteComplete(result?.data || null);
      }
    } catch (error) {
      // Handle AlreadyVoted error gracefully
      if (error.message?.includes('AlreadyVoted') || error.message?.includes('already voted')) {
        toast.info("You have already cast your vote on this proposal");
        setLocalHasVoted(true);
      } else {
        toast.error(error.message || "Failed to vote");
      }
    } finally {
      setVoting(null);
    }
  };

  if (hasVoted || localHasVoted) {
    return (
      <div className="text-sm text-muted-foreground">
        ✓ You have already voted (VP: {userVotingPower.toLocaleString()})
      </div>
    );
  }

  if (userVotingPower === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No voting power - lock LP tokens to participate
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="default"
        size="sm"
        className="flex-1 bg-green-600 hover:bg-green-700"
        onClick={() => handleVote(true)}
        disabled={disabled || voting !== null}
      >
        {voting === 'yes' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Voting...</>
        ) : (
          <><ThumbsUp className="mr-2 h-4 w-4" /> Vote Yes ({userVotingPower.toLocaleString()} VP)</>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
        onClick={() => handleVote(false)}
        disabled={disabled || voting !== null}
      >
        {voting === 'no' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Voting...</>
        ) : (
          <><ThumbsDown className="mr-2 h-4 w-4" /> Vote No</>
        )}
      </Button>
    </div>
  );
}

export default VoteButtons;
