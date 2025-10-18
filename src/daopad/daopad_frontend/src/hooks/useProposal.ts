import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { DAOPadBackendService } from '../services/daopadBackend';
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
  };

  return typeMap[operationType] || { Other: operationType };
}

export function useProposal(tokenId, orbitRequestId, operationType) {
  const { identity } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null); // 'Yes' | 'No' | null
  const [error, setError] = useState(null);

  // Fetch user's vote status
  const fetchVoteStatus = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) return;

    try {
      const backend = new DAOPadBackendService(identity);
      const result = await backend.getUserVoteStatus(
        Principal.fromText(tokenId),
        orbitRequestId
      );

      if (result.success && result.data) {
        setHasVoted(result.data.has_voted);
        // Extract vote choice from variant: { Yes: null } or { No: null }
        if (result.data.vote_choice && result.data.vote_choice.length > 0) {
          const voteVariant = result.data.vote_choice[0];
          if (voteVariant && typeof voteVariant === 'object') {
            if ('Yes' in voteVariant) {
              setUserVote('Yes');
            } else if ('No' in voteVariant) {
              setUserVote('No');
            }
          }
        } else {
          setUserVote(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch vote status:', err);
    }
  }, [identity, tokenId, orbitRequestId]);

  // Fetch proposal for this Orbit request
  const fetchProposal = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const backend = new DAOPadBackendService(identity);

      // Fetch both proposal and vote status in parallel
      const [proposalResult, voteResult] = await Promise.all([
        backend.getOrbitRequestProposal(
          Principal.fromText(tokenId),
          orbitRequestId
        ),
        backend.getUserVoteStatus(
          Principal.fromText(tokenId),
          orbitRequestId
        )
      ]);

      if (proposalResult.success) {
        setProposal(proposalResult.data);
      } else {
        setProposal(null);
      }

      if (voteResult.success && voteResult.data) {
        setHasVoted(voteResult.data.has_voted);
        // Extract vote choice from variant
        if (voteResult.data.vote_choice && voteResult.data.vote_choice.length > 0) {
          const voteVariant = voteResult.data.vote_choice[0];
          if (voteVariant && typeof voteVariant === 'object') {
            if ('Yes' in voteVariant) {
              setUserVote('Yes');
            } else if ('No' in voteVariant) {
              setUserVote('No');
            }
          }
        } else {
          setUserVote(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch proposal:', err);
      setError(err.message);
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [identity, tokenId, orbitRequestId]);

  // Auto-create proposal if it doesn't exist
  const ensureProposal = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId || !operationType) return;

    try {
      const backend = new DAOPadBackendService(identity);
      const actor = await backend.getActor();

      // Infer request type from operation string
      const requestType = inferRequestType(operationType);

      await actor.ensure_proposal_for_request(
        Principal.fromText(tokenId),
        orbitRequestId,
        requestType
      );

      // Refresh proposal data
      await fetchProposal();
    } catch (err) {
      console.error('Failed to create proposal:', err);
      setError(err.message);
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
    ensureProposal
  };
}
