import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { getProposalService } from '../services/backend';
import { getAdminService } from '../services/admin/AdminService';
import { Principal } from '@dfinity/principal';

// REMOVED: inferRequestType helper no longer needed
// Admin canister handles operation type mapping directly

export function useProposal(tokenId, orbitRequestId, operationType) {
  const { identity } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null); // NEW: Track actual vote
  const [error, setError] = useState(null);

  // Check if user has voted (using admin canister)
  const checkVoteStatus = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) return;

    try {
      // Use admin service for vote tracking
      const adminService = getAdminService(identity);

      // Call admin canister methods directly
      const voted = await adminService.hasUserVoted(
        identity.getPrincipal(),
        tokenId,
        orbitRequestId
      );

      setHasVoted(voted);

      // Get actual vote if voted
      if (voted) {
        const vote = await adminService.getUserVote(
          identity.getPrincipal(),
          tokenId,
          orbitRequestId
        );
        setUserVote(vote); // Will be { Yes: null } or { No: null }
      }
    } catch (err) {
      console.error('Failed to check vote status from admin canister:', err);
    }
  }, [identity, tokenId, orbitRequestId]);

  // Fetch proposal for this Orbit request
  const fetchProposal = useCallback(async () => {
    if (!tokenId || !orbitRequestId) {
      setLoading(false);
      return;
    }
    // ✅ Proposals viewable without identity - voting requires auth

    setLoading(true);
    setError(null);
    try {
      // Use admin service to get proposal (it tracks votes)
      const adminService = getAdminService(identity || null);
      const proposal = await adminService.getProposal(
        tokenId,
        orbitRequestId
      );

      if (proposal) {
        // Convert BigInt values to numbers for display
        const processedProposal = {
          ...proposal,
          yes_votes: typeof proposal.yes_votes === 'bigint' ? Number(proposal.yes_votes) : proposal.yes_votes,
          no_votes: typeof proposal.no_votes === 'bigint' ? Number(proposal.no_votes) : proposal.no_votes,
          total_voting_power: typeof proposal.total_voting_power === 'bigint' ? Number(proposal.total_voting_power) : proposal.total_voting_power,
          created_at: typeof proposal.created_at === 'bigint' ? Number(proposal.created_at) : proposal.created_at,
          expires_at: typeof proposal.expires_at === 'bigint' ? Number(proposal.expires_at) : proposal.expires_at,
        };
        setProposal(processedProposal);

        // NEW: Check if user has voted
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

  // Auto-create proposal if it doesn't exist (admin canister ensures vote tracking)
  const ensureProposal = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId || !operationType) {
      console.log('[useProposal] Missing required params for ensureProposal:', {
        hasIdentity: !!identity,
        tokenId,
        orbitRequestId,
        operationType
      });
      return;
    }

    try {
      console.log('[useProposal] Creating proposal tracking for:', {
        tokenId,
        orbitRequestId,
        operationType
      });

      // Use admin service to ensure vote tracking
      const adminService = getAdminService(identity);

      // Pass operation type as string (admin will handle mapping)
      const result = await adminService.ensureProposalForRequest(
        tokenId,
        orbitRequestId,
        operationType  // Pass as string, not variant
      );

      console.log('[useProposal] Proposal created:', result);

      // Refresh proposal data
      await fetchProposal();
    } catch (err) {
      console.error('[useProposal] Failed to create proposal:', err);
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
    hasVoted, // Now properly tracked from backend
    userVote, // NEW: Actual vote choice
    error,
    fetchProposal,
    ensureProposal,
    checkVoteStatus // NEW: Expose for manual refresh
  };
}
