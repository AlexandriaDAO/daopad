import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider/IIProvider';
import { getProposalService, BackendServiceBase } from '../services/backend';
import { Principal } from '@dfinity/principal';

// Helper function to convert operation type string to backend variant
function convertOperationTypeToVariant(operationType) {
  // Handle both string and object operation types
  let opTypeString = operationType;

  // If it's an object like { EditPermission: {...} }, extract the key
  if (typeof operationType === 'object' && operationType !== null) {
    const keys = Object.keys(operationType);
    if (keys.length > 0) {
      opTypeString = keys[0];
    }
  }

  // Map operation type strings to backend enum variants
  const typeMap = {
    'Transfer': { Transfer: null },
    'AddAccount': { AddAccount: null },
    'EditAccount': { EditAccount: null },
    'AddUser': { AddUser: null },
    'EditUser': { EditUser: null },
    'RemoveUser': { RemoveUser: null },
    'AddUserGroup': { AddUserGroup: null },
    'EditUserGroup': { EditUserGroup: null },
    'RemoveUserGroup': { RemoveUserGroup: null },
    'CreateExternalCanister': { CreateExternalCanister: null },
    'ConfigureExternalCanister': { ConfigureExternalCanister: null },
    'ChangeExternalCanister': { ChangeExternalCanister: null },
    'CallExternalCanister': { CallExternalCanister: null },
    'FundExternalCanister': { FundExternalCanister: null },
    'MonitorExternalCanister': { MonitorExternalCanister: null },
    'SnapshotExternalCanister': { SnapshotExternalCanister: null },
    'RestoreExternalCanister': { RestoreExternalCanister: null },
    'PruneExternalCanister': { PruneExternalCanister: null },
    'SystemUpgrade': { SystemUpgrade: null },
    'SystemRestore': { SystemRestore: null },
    'SetDisasterRecovery': { SetDisasterRecovery: null },
    'ManageSystemInfo': { ManageSystemInfo: null },
    'EditPermission': { EditPermission: null },
    'AddRequestPolicy': { AddRequestPolicy: null },
    'EditRequestPolicy': { EditRequestPolicy: null },
    'RemoveRequestPolicy': { RemoveRequestPolicy: null },
    'AddAsset': { AddAsset: null },
    'EditAsset': { EditAsset: null },
    'RemoveAsset': { RemoveAsset: null },
    'AddNamedRule': { AddNamedRule: null },
    'EditNamedRule': { EditNamedRule: null },
    'RemoveNamedRule': { RemoveNamedRule: null },
    'AddAddressBookEntry': { AddAddressBookEntry: null },
    'EditAddressBookEntry': { EditAddressBookEntry: null },
    'RemoveAddressBookEntry': { RemoveAddressBookEntry: null },
  };

  // Return the variant or a default "Other" variant for unknown types
  return typeMap[opTypeString] || { Other: opTypeString || 'Unknown' };
}

export function useProposal(tokenId, orbitRequestId, operationType) {
  const { identity } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [error, setError] = useState(null);

  // Check if user has voted (using backend directly)
  const checkVoteStatus = useCallback(async () => {
    if (!identity || !tokenId || !orbitRequestId) return;

    try {
      // Use backend service for vote tracking
      const backendService = new BackendServiceBase(identity);
      const actor = await backendService.getActor();

      // Call backend methods directly
      console.log('[checkVoteStatus] Checking vote status for:', {
        user: identity.getPrincipal().toString(),
        tokenId,
        orbitRequestId
      });

      const voted = await actor.has_user_voted_on_orbit_request(
        identity.getPrincipal(),
        Principal.fromText(tokenId),
        orbitRequestId
      );

      console.log('[checkVoteStatus] Has voted:', voted);
      setHasVoted(voted);

      // Get actual vote if voted
      if (voted) {
        const vote = await actor.get_user_vote_on_orbit_request(
          identity.getPrincipal(),
          Principal.fromText(tokenId),
          orbitRequestId
        );
        console.log('[checkVoteStatus] User vote:', vote);
        setUserVote(vote); // Will be [{ Yes: null }] or [{ No: null }] or []
      }
    } catch (err) {
      console.error('Failed to check vote status from backend:', err);
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
      // Use backend service to get proposal
      const backendService = new BackendServiceBase(identity || null);
      const actor = await backendService.getActor();

      const proposal = await actor.get_orbit_request_proposal(
        Principal.fromText(tokenId),
        orbitRequestId
      );

      if (proposal && proposal.length > 0) {
        const prop = proposal[0]; // Backend returns Option<T> as array
        // Convert BigInt values to numbers for display
        const processedProposal = {
          ...prop,
          yes_votes: typeof prop.yes_votes === 'bigint' ? Number(prop.yes_votes) : prop.yes_votes,
          no_votes: typeof prop.no_votes === 'bigint' ? Number(prop.no_votes) : prop.no_votes,
          total_voting_power: typeof prop.total_voting_power === 'bigint' ? Number(prop.total_voting_power) : prop.total_voting_power,
          created_at: typeof prop.created_at === 'bigint' ? Number(prop.created_at) : prop.created_at,
          expires_at: typeof prop.expires_at === 'bigint' ? Number(prop.expires_at) : prop.expires_at,
        };
        setProposal(processedProposal);

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
      console.log('[useProposal] Creating proposal tracking for:', {
        tokenId,
        orbitRequestId,
        operationType
      });

      // Use backend service to ensure vote tracking
      const backendService = new BackendServiceBase(identity);
      const actor = await backendService.getActor();

      // Convert operation type string to proper variant for backend
      const requestTypeVariant = convertOperationTypeToVariant(operationType);

      const result = await actor.ensure_proposal_for_request(
        Principal.fromText(tokenId),
        orbitRequestId,
        requestTypeVariant
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
    hasVoted,
    userVote,
    error,
    fetchProposal,
    ensureProposal,
    checkVoteStatus
  };
}
