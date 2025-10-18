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

  // Vote on an Orbit request
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
        throw new Error(result.error || 'Failed to submit vote');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to submit vote');
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
