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
  hasVoted,
  onVoteComplete
}) {
  const navigate = useNavigate();
  const [voting, setVoting] = useState(null); // 'yes' | 'no' | null
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted);
  const [voteError, setVoteError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleVote = async (vote) => {
    setVoting(vote ? 'yes' : 'no');
    setVoteError(null);

    try {
      await onVote(orbitRequestId, vote);

      // Only set success state if vote actually succeeded
      toast.success(`Vote recorded! ${vote ? "Yes" : "No"} with ${userVotingPower.toLocaleString()} VP`);
      setLocalHasVoted(true);

      if (onVoteComplete) {
        setTimeout(onVoteComplete, 500); // Small delay for UI feedback
      }
    } catch (error) {
      setVoteError(error);

      // Handle specific error types
      if (error.code === 'ALREADY_VOTED') {
        setLocalHasVoted(true);
        toast.info(error.message);
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

      // Don't set localHasVoted unless actually voted!
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
