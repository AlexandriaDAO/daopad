import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { useDaopadBackend, useAdmin } from './actors';
import { Principal } from '@dfinity/principal';

export function useVoting(tokenId) {
  const { identity } = useAuth();
  const backend = useDaopadBackend();
  const admin = useAdmin();

  const [voting, setVoting] = useState(false);
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [loadingVP, setLoadingVP] = useState(false);

  // Fetch user's voting power for this token/station
  // IMPORTANT: This now uses the unified VP query which routes by station type
  const fetchVotingPower = useCallback(async () => {
    if (!identity || !tokenId) return;

    try {
      setLoadingVP(true);
      const tokenPrincipal = typeof tokenId === 'string' ? Principal.fromText(tokenId) : tokenId;
      const userPrincipal = identity.getPrincipal();

      // Use unified VP query that routes by station type (equity % vs Kong Locker)
      const result = await backend.actor?.get_voting_power_display(tokenPrincipal, userPrincipal);

      if (!result) {
        setUserVotingPower(0);
        return;
      }

      if ('Ok' in result) {
        // Extract voting_power from VotingPowerResult
        setUserVotingPower(Number(result.Ok.voting_power));
      } else {
        console.error('Failed to fetch voting power:', result.Err);
        setUserVotingPower(0);
      }
    } catch (err) {
      console.error('Failed to fetch voting power:', err);
      setUserVotingPower(0);
    } finally {
      setLoadingVP(false);
    }
  }, [identity, tokenId, backend.actor]);

  // Auto-fetch voting power when identity or tokenId changes
  useEffect(() => {
    fetchVotingPower();
  }, [fetchVotingPower]);

  // Vote on an Orbit request via admin canister
  const vote = useCallback(async (orbitRequestId, voteChoice) => {
    if (!identity) throw new Error('Not authenticated');
    if (!tokenId) throw new Error('Token ID required');

    setVoting(true);
    try {
      const tokenPrincipal = typeof tokenId === 'string' ? Principal.fromText(tokenId) : tokenId;

      // Call admin canister to vote
      const result = await admin.actor?.vote_on_proposal(
        tokenPrincipal,
        orbitRequestId,
        voteChoice
      );

      if (!result) {
        throw new Error('Failed to call vote method');
      }

      if ('Ok' in result) {
        return { success: true };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('[useVoting] Vote error:', error);

      // Parse error message
      let errorString = 'Vote failed';
      if (error.message) {
        errorString = error.message;
      } else if (typeof error === 'string') {
        errorString = error;
      }

      // Categorize error
      let errorCode = 'UNKNOWN_ERROR';
      let canRetry = false;

      if (errorString.includes('register with Kong Locker')) {
        errorCode = 'KONG_LOCKER_NOT_REGISTERED';
      } else if (errorString.includes('temporarily unavailable')) {
        errorCode = 'SERVICE_UNAVAILABLE';
        canRetry = true;
      } else if (errorString.includes('No voting power')) {
        errorCode = 'NO_VOTING_POWER';
      } else if (errorString.includes('Already voted')) {
        errorCode = 'ALREADY_VOTED';
      } else if (errorString.includes('expired')) {
        errorCode = 'PROPOSAL_EXPIRED';
      } else if (errorString.includes('NotFound')) {
        errorCode = 'PROPOSAL_NOT_FOUND';
      }

      throw {
        code: errorCode,
        message: getReadableError(errorCode, errorString),
        canRetry,
        originalError: error
      };
    } finally {
      setVoting(false);
    }
  }, [identity, tokenId, admin.actor]);

  return {
    vote,
    voting,
    userVotingPower,
    fetchVotingPower,
    loadingVP
  };
}

// Helper function to convert error codes to user-friendly messages
function getReadableError(code: string, fallback: string): string {
  const errorMap = {
    'KONG_LOCKER_NOT_REGISTERED': 'Please register with Kong Locker in Settings first',
    'SERVICE_UNAVAILABLE': 'Service temporarily down. Please try again.',
    'NO_VOTING_POWER': 'You need LP tokens for this token to vote',
    'ALREADY_VOTED': 'You have already voted on this proposal',
    'PROPOSAL_EXPIRED': 'This proposal has expired',
    'PROPOSAL_NOT_FOUND': 'Proposal not found. It may need to be created first.',
    'UNKNOWN_ERROR': fallback || 'Vote failed. Please try again.'
  };

  return errorMap[code] || fallback;
}
