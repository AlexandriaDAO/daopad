import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { getProposalService } from '../services/backend';
import { Principal } from '@dfinity/principal';

// Helper: Map operation type string to enum variant
// MUST match backend's infer_request_type() at orbit_requests.rs:303-361
function inferRequestType(operationType) {
  const typeMap = {
    // Treasury (3)
    'Transfer': { Transfer: null },
    'AddAccount': { AddAccount: null },
    'EditAccount': { EditAccount: null },

    // Users (3)
    'AddUser': { AddUser: null },
    'EditUser': { EditUser: null },
    'RemoveUser': { RemoveUser: null },

    // Groups (3)
    'AddUserGroup': { AddUserGroup: null },
    'EditUserGroup': { EditUserGroup: null },
    'RemoveUserGroup': { RemoveUserGroup: null },

    // Canisters (9)
    'CreateExternalCanister': { CreateExternalCanister: null },
    'ConfigureExternalCanister': { ConfigureExternalCanister: null },
    'ChangeExternalCanister': { ChangeExternalCanister: null },
    'CallExternalCanister': { CallExternalCanister: null },
    'FundExternalCanister': { FundExternalCanister: null },
    'MonitorExternalCanister': { MonitorExternalCanister: null },
    'SnapshotExternalCanister': { SnapshotExternalCanister: null },
    'RestoreExternalCanister': { RestoreExternalCanister: null },
    'PruneExternalCanister': { PruneExternalCanister: null },

    // System (4)
    'SystemUpgrade': { SystemUpgrade: null },
    'SystemRestore': { SystemRestore: null },
    'SetDisasterRecovery': { SetDisasterRecovery: null },
    'ManageSystemInfo': { ManageSystemInfo: null },

    // Governance (4)
    'EditPermission': { EditPermission: null },
    'AddRequestPolicy': { AddRequestPolicy: null },
    'EditRequestPolicy': { EditRequestPolicy: null },
    'RemoveRequestPolicy': { RemoveRequestPolicy: null },

    // Assets (3)
    'AddAsset': { AddAsset: null },
    'EditAsset': { EditAsset: null },
    'RemoveAsset': { RemoveAsset: null },

    // Rules (3)
    'AddNamedRule': { AddNamedRule: null },
    'EditNamedRule': { EditNamedRule: null },
    'RemoveNamedRule': { RemoveNamedRule: null },

    // Address Book (3)
    'AddAddressBookEntry': { AddAddressBookEntry: null },
    'EditAddressBookEntry': { EditAddressBookEntry: null },
    'RemoveAddressBookEntry': { RemoveAddressBookEntry: null },

    // Handle Unknown as a fallback type - default to Transfer for now
    'Unknown': { Transfer: null },
  };

  return typeMap[operationType] || { Other: operationType };
}

export function useProposal(tokenId, orbitRequestId, operationType) {
  const { identity } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null); // NEW: Track actual vote
  const [error, setError] = useState(null);

  // NEW: Check if user has voted
  const checkVoteStatus = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) return;

    try {
      const proposalService = getProposalService(identity);
      const actor = await proposalService.getActor();

      // Call new backend method
      const voted = await actor.has_user_voted_on_orbit_request(
        identity.getPrincipal(),
        Principal.fromText(tokenId),
        orbitRequestId
      );

      setHasVoted(voted);

      // Get actual vote if voted
      if (voted) {
        const vote = await actor.get_user_vote_on_orbit_request(
          identity.getPrincipal(),
          Principal.fromText(tokenId),
          orbitRequestId
        );
        setUserVote(vote); // Will be { Yes: null } or { No: null }
      }
    } catch (err) {
      console.error('Failed to check vote status:', err);
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
      const proposalService = getProposalService(identity || null);
      const result = await proposalService.getOrbitRequestProposal(
        Principal.fromText(tokenId),
        orbitRequestId
      );

      if (result.success && result.data) {
        // Convert BigInt values to numbers for display
        const proposal = {
          ...result.data,
          yes_votes: typeof result.data.yes_votes === 'bigint' ? Number(result.data.yes_votes) : result.data.yes_votes,
          no_votes: typeof result.data.no_votes === 'bigint' ? Number(result.data.no_votes) : result.data.no_votes,
          total_voting_power: typeof result.data.total_voting_power === 'bigint' ? Number(result.data.total_voting_power) : result.data.total_voting_power,
          created_at: typeof result.data.created_at === 'bigint' ? Number(result.data.created_at) : result.data.created_at,
          expires_at: typeof result.data.expires_at === 'bigint' ? Number(result.data.expires_at) : result.data.expires_at,
        };
        setProposal(proposal);

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

  // Auto-create proposal if it doesn't exist
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
      console.log('[useProposal] Creating proposal for:', {
        tokenId,
        orbitRequestId,
        operationType
      });

      const proposalService = getProposalService(identity);
      const actor = await proposalService.getActor();

      // Pass operation type as STRING, not object
      console.log('[useProposal] Creating proposal for operation:', operationType);

      const result = await actor.ensure_proposal_for_request(
        Principal.fromText(tokenId),
        orbitRequestId,
        operationType  // ✅ Pass string directly: "EditAccount", "Transfer", etc.
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
