import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { getAdminService } from '../services/admin/AdminService';
import { Principal } from '@dfinity/principal';

export function useProposal(tokenId, orbitRequestId, operationType) {
  const { identity } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null); // NEW: Track actual vote
  const [error, setError] = useState(null);

  // Check if user has voted
  const checkVoteStatus = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) return;

    try {
      const adminService = getAdminService(identity);
      const voted = await adminService.hasUserVoted(
        identity.getPrincipal().toText(),
        tokenId,
        orbitRequestId
      );

      setHasVoted(voted);
    } catch (err) {
      console.error('Failed to check vote status:', err);
    }
  }, [identity, tokenId, orbitRequestId]);

  // Fetch proposal (vote data) from admin
  const fetchProposal = useCallback(async () => {
    if (!tokenId || !orbitRequestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const adminService = getAdminService(identity || null);
      const voteStatus = await adminService.getVoteStatus(tokenId, orbitRequestId);

      if (voteStatus) {
        setProposal(voteStatus);
        await checkVoteStatus();
      } else {
        setProposal(null);
        setHasVoted(false);
      }
    } catch (err) {
      console.error('Failed to fetch proposal:', err);
      setError(err.message);
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [identity, tokenId, orbitRequestId, checkVoteStatus]);

  // Ensure vote tracking exists in admin
  const ensureProposal = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId || !operationType) {
      console.log('[useProposal] Missing required params');
      return;
    }

    try {
      console.log('[useProposal] Ensuring vote tracking for:', {
        tokenId,
        orbitRequestId,
        operationType
      });

      const adminService = getAdminService(identity);
      await adminService.ensureProposal(tokenId, orbitRequestId, operationType);

      // Refresh proposal data
      await fetchProposal();
    } catch (err) {
      console.error('[useProposal] Failed to ensure proposal:', err);
      setError(err.message || 'Failed to create proposal');
    }
  }, [identity, tokenId, orbitRequestId, operationType, fetchProposal]);

  // Initial fetch
  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  return {
    proposal,
    loading,
    hasVoted,
    userVote,
    error,
    fetchProposal,
    ensureProposal,
    checkVoteStatus
  };
}
