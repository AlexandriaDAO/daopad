import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { getProposalService, getAdminService } from '../services/backend';
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
      const adminService = getAdminService(identity);
      const actor = await adminService.getActor();

      // Call admin canister methods (not backend!)
      const voted = await actor.has_user_voted(
        identity.getPrincipal(),
        Principal.fromText(tokenId),
        orbitRequestId
      );

      setHasVoted(voted);

      // Get actual vote if voted
      if (voted) {
        const voteData = await actor.get_user_vote(
          identity.getPrincipal(),
          Principal.fromText(tokenId),
          orbitRequestId
        );

        // Candid opt type returns as array - unwrap it
        const vote = voteData && voteData.length > 0 ? voteData[0] : null;
        console.log('[checkVoteStatus] User vote:', { raw: voteData, unwrapped: vote });
        setUserVote(vote); // Now properly unwrapped: { Yes: null } or { No: null }
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
      const adminService = getAdminService(identity || null);
      const proposalData = await adminService.getProposal(tokenId, orbitRequestId);

      console.log('[useProposal] Raw proposal data from admin canister:', proposalData);

      // Candid opt type returns as array - unwrap it
      if (proposalData && proposalData.length > 0) {
        const rawProposal = proposalData[0];

        // Convert BigInt values to numbers for display
        const proposal = {
          ...rawProposal,
          yes_votes: typeof rawProposal.yes_votes === 'bigint' ? Number(rawProposal.yes_votes) : rawProposal.yes_votes,
          no_votes: typeof rawProposal.no_votes === 'bigint' ? Number(rawProposal.no_votes) : rawProposal.no_votes,
          total_voting_power: typeof rawProposal.total_voting_power === 'bigint' ? Number(rawProposal.total_voting_power) : rawProposal.total_voting_power,
          created_at: typeof rawProposal.created_at === 'bigint' ? Number(rawProposal.created_at) : rawProposal.created_at,
          expires_at: typeof rawProposal.expires_at === 'bigint' ? Number(rawProposal.expires_at) : rawProposal.expires_at,
        };

        console.log('[useProposal] Converted proposal for display:', proposal);
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

      const adminService = getAdminService(identity);

      // Pass operation type as STRING, not object
      console.log('[useProposal] Creating proposal for operation:', operationType);

      const result = await adminService.ensureProposalForRequest(
        tokenId,
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
