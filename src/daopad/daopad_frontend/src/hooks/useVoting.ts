import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { getKongLockerService, getAdminService } from '../services/backend';
import { Principal } from '@dfinity/principal';

export function useVoting(tokenId) {
  const { identity } = useAuth();
  const [voting, setVoting] = useState(false);
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [loadingVP, setLoadingVP] = useState(false);

  // Fetch user's voting power for this token
  const fetchVotingPower = useCallback(async () => {
    if (!identity || !tokenId) return;

    try {
      setLoadingVP(true);
      const kongService = getKongLockerService(identity);
      const result = await kongService.getVotingPower(tokenId);

      if (result.success) {
        setUserVotingPower(Number(result.data));
      } else {
        console.error('Failed to fetch voting power:', result.error);
        setUserVotingPower(0);
      }
    } catch (err) {
      console.error('Failed to fetch voting power:', err);
      setUserVotingPower(0);
    } finally {
      setLoadingVP(false);
    }
  }, [identity, tokenId]);

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
      const adminService = getAdminService(identity);
      await adminService.voteOnProposal(tokenId, orbitRequestId, voteChoice);

      return { success: true };
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
  }, [identity, tokenId]);

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
