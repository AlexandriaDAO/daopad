import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { DAOPadBackendService } from '../services/daopadBackend';
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
      const backend = new DAOPadBackendService(identity);
      const result = await backend.getMyVotingPowerForToken(Principal.fromText(tokenId));

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

  // Vote on an Orbit request with improved error handling
  const vote = useCallback(async (orbitRequestId, voteChoice) => {
    if (!identity) throw new Error('Not authenticated');

    setVoting(true);
    try {
      const backend = new DAOPadBackendService(identity);
      const result = await backend.voteOnOrbitRequest(
        Principal.fromText(tokenId),
        orbitRequestId,
        voteChoice
      );

      if (!result.success) {
        // Parse specific error types
        const error = result.error || 'Vote failed';

        let errorCode = 'UNKNOWN_ERROR';
        let canRetry = false;

        if (error.includes('register with Kong Locker')) {
          errorCode = 'KONG_LOCKER_NOT_REGISTERED';
        } else if (error.includes('temporarily unavailable')) {
          errorCode = 'SERVICE_UNAVAILABLE';
          canRetry = true;
        } else if (error.includes('No voting power')) {
          errorCode = 'NO_VOTING_POWER';
        } else if (error.includes('Already voted')) {
          errorCode = 'ALREADY_VOTED';
        } else if (error.includes('expired')) {
          errorCode = 'PROPOSAL_EXPIRED';
        }

        // Throw structured error object
        throw {
          code: errorCode,
          message: getReadableError(errorCode, error),
          canRetry,
          originalError: error
        };
      }

      return { success: true };
    } catch (error) {
      console.error('[useVoting] Vote error:', error);

      // If already structured, pass through
      if (error.code) {
        throw error;
      }

      // Otherwise structure it
      throw {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Failed to submit vote',
        canRetry: false,
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
    'UNKNOWN_ERROR': fallback || 'Vote failed. Please try again.'
  };

  return errorMap[code] || fallback;
}
