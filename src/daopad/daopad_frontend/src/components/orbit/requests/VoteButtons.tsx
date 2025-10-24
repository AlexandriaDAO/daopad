import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function VoteButtons({
  proposalId,
  orbitRequestId,
  tokenId,
  onVote,
  disabled,
  userVotingPower,
  hasVoted, // Now comes from backend, not local state
  userVote, // NEW: Show what they voted for
  onVoteComplete
}) {
  const navigate = useNavigate();
  const [voting, setVoting] = useState(null); // 'yes' | 'no' | null
  // Remove localHasVoted - use prop from backend
  const [voteError, setVoteError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleVote = async (vote) => {
    setVoting(vote ? 'yes' : 'no');
    setVoteError(null);

    try {
      await onVote(orbitRequestId, vote);

      // Only set success state if vote actually succeeded
      toast.success(`Vote recorded! ${vote ? "Yes" : "No"} with ${userVotingPower.toLocaleString()} VP`);

      // After successful vote, trigger refresh
      if (onVoteComplete) {
        setTimeout(onVoteComplete, 500);
      }
    } catch (error) {
      setVoteError(error);

      // Handle specific error types
      if (error.code === 'ALREADY_VOTED') {
        toast.info(error.message);
        // Refresh to get vote status from backend
        if (onVoteComplete) {
          onVoteComplete();
        }
      } else if (error.code === 'KONG_LOCKER_NOT_REGISTERED') {
        toast.error(
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p>{error.message}</p>
              <button
                onClick={() => navigate('/settings/kong-locker')}
                className="mt-1 text-xs underline hover:text-primary"
              >
                Go to Settings →
              </button>
            </div>
          </div>
        );
      } else if (error.canRetry) {
        toast.warning(
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p>{error.message}</p>
              <button
                onClick={() => retryVote(vote)}
                className="mt-1 text-xs underline hover:text-primary"
              >
                Retry Vote →
              </button>
            </div>
          </div>
        );
      } else {
        toast.error(error.message || 'Vote failed');
      }
    } finally {
      setVoting(null);
    }
  };

  // Retry mechanism for temporary failures
  const retryVote = async (vote) => {
    setIsRetrying(true);
    toast.info("Retrying vote...");
    await new Promise(r => setTimeout(r, 2000)); // Wait 2s
    await handleVote(vote);
    setIsRetrying(false);
  };

  // Show vote status from backend
  if (hasVoted) {
    const voteText = userVote
      ? (Object.keys(userVote)[0] === 'Yes' ? 'YES' : 'NO')
      : 'UNKNOWN';

    return (
      <div className="text-sm text-muted-foreground" data-testid="vote-already-voted">
        ✓ You voted {voteText} (VP: {userVotingPower.toLocaleString()})
      </div>
    );
  }

  if (userVotingPower === 0) {
    return (
      <div className="text-sm text-muted-foreground" data-testid="vote-no-power">
        No voting power - lock LP tokens to participate
      </div>
    );
  }

  return (
    <div className="flex gap-2" data-testid="vote-buttons">
      <Button
        variant="default"
        size="sm"
        className="flex-1 bg-green-600 hover:bg-green-700"
        onClick={() => handleVote(true)}
        disabled={disabled || voting !== null}
        data-testid="vote-yes-button"
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
        data-testid="vote-no-button"
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
