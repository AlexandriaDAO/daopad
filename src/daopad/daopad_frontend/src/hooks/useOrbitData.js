import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DAOPadBackendService } from '../services/daopadBackend';
import { Principal } from '@dfinity/principal';

// CRITICAL: Handle Orbit's double-wrapped Result types
const parseOrbitResponse = (response) => {
  // Orbit returns Result::Ok(Result::Ok(data)) or Result::Ok(Result::Err(error))
  if (response?.Ok) {
    if (response.Ok.Ok) {
      return { success: true, data: response.Ok.Ok };
    } else if (response.Ok.Err) {
      return { success: false, error: response.Ok.Err };
    }
  }
  // Handle our backend's response format
  if (response?.success !== undefined) {
    return response;
  }
  return { success: false, error: 'Invalid response structure' };
};

// Hook for voting power - deduplicated across components
export const useVotingPower = (tokenId, identity) => {
  return useQuery({
    queryKey: ['votingPower', tokenId, identity?.getPrincipal?.()?.toString()],
    queryFn: async () => {
      if (!tokenId || !identity) return null;

      const service = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);
      const result = await service.getMyVotingPowerForToken(tokenPrincipal);

      // Log for debugging Orbit integration issues
      console.log('Voting power response:', result);

      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch voting power');
    },
    enabled: !!tokenId && !!identity,
    staleTime: 60000,  // VP doesn't change often
    cacheTime: 5 * 60 * 1000,
  });
};

// Hook for Orbit requests with proper field handling
export const useOrbitRequests = (tokenId, stationId, filters = {}, identity) => {
  return useQuery({
    queryKey: ['orbitRequests', tokenId, stationId, filters],
    queryFn: async () => {
      if (!tokenId || !identity) return { requests: [], total: 0 };

      const service = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);

      // CRITICAL: Include ALL fields expected by backend
      const requestInput = {
        statuses: filters.statuses || ['Created', 'Approved', 'Processing', 'Scheduled'],
        deduplication_keys: [],  // Don't omit!
        tags: [],                 // Don't omit!
        only_approvable: filters.only_approvable || false,
        created_from: filters.created_from || null,
        created_to: filters.created_to || null,
        expiration_from: filters.expiration_from || null,
        expiration_to: filters.expiration_to || null,
        sort_by: filters.sort_by || { field: 'ExpirationDt', direction: 'Asc' },
        page: filters.page || 0,
        limit: filters.limit || 20,
      };

      console.log('Orbit request input:', requestInput);
      const result = await service.listOrbitRequests(tokenPrincipal, requestInput);

      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch requests');
    },
    enabled: !!tokenId && !!identity,
    refetchInterval: 15000,  // Adjusted from 5s
  });
};

// Hook for Orbit members
export const useOrbitMembers = (stationId, identity) => {
  return useQuery({
    queryKey: ['orbitMembers', stationId],
    queryFn: async () => {
      if (!stationId || !identity) return { members: [], total: 0 };

      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);
      const result = await service.listOrbitMembers(stationPrincipal);

      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch members');
    },
    enabled: !!stationId && !!identity,
    refetchInterval: 30000,  // Members don't change often
  });
};

// Hook for Orbit accounts with balances
export const useOrbitAccounts = (stationId, identity, searchQuery = '', pagination = {}) => {
  return useQuery({
    queryKey: ['orbitAccounts', stationId, searchQuery, pagination],
    queryFn: async () => {
      if (!stationId || !identity) return { accounts: [], total: 0, privileges: [] };

      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const response = await service.listOrbitAccounts(
        stationPrincipal,
        searchQuery || undefined,
        pagination.limit || 20,
        pagination.offset || 0
      );

      if (response.success) {
        // Fetch balances for accounts
        const accountIds = response.data.accounts?.map(a => a.id) || [];
        if (accountIds.length > 0) {
          const balancesResult = await service.fetchOrbitAccountBalances(
            stationPrincipal,
            accountIds
          );

          if (balancesResult.success) {
            const balancesMap = {};
            balancesResult.data.forEach((balance) => {
              if (balance && balance.length > 0) {
                const balanceData = balance[0];
                if (balanceData && balanceData.account_id) {
                  balancesMap[balanceData.account_id] = balanceData;
                }
              }
            });
            response.data.balances = balancesMap;
          }
        }
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch accounts');
    },
    enabled: !!stationId && !!identity,
    refetchInterval: 60000,  // Accounts don't change often
  });
};

// Hook for token metadata
export const useTokenMetadata = (tokenId) => {
  return useQuery({
    queryKey: ['tokenMetadata', tokenId],
    queryFn: async () => {
      if (!tokenId) return null;

      const result = await DAOPadBackendService.getTokenMetadata(tokenId);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch token metadata');
    },
    enabled: !!tokenId,
    staleTime: 5 * 60 * 1000,  // Metadata rarely changes
  });
};

// Hook for Orbit station status
export const useOrbitStation = (tokenId, identity) => {
  return useQuery({
    queryKey: ['orbitStation', tokenId],
    queryFn: async () => {
      if (!tokenId || !identity) return null;

      const service = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);

      const stationResult = await service.getOrbitStationForToken(tokenPrincipal);
      if (stationResult.success && stationResult.data) {
        const stationText = typeof stationResult.data === 'string'
          ? stationResult.data
          : stationResult.data.toString();

        return {
          station_id: stationText,
          status: 'linked',
        };
      }

      // Check for active proposal
      const proposalResult = await service.getActiveProposalForToken(tokenPrincipal);
      if (proposalResult.success && proposalResult.data) {
        return {
          activeProposal: proposalResult.data,
          status: 'proposal',
        };
      }

      return { status: 'missing' };
    },
    enabled: !!tokenId && !!identity,
    refetchInterval: 30000,  // Check station status every 30s
  });
};

// Mutation hooks for Orbit operations
export const useCreateTransferRequest = (stationId, identity) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params) => {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      // Ensure all required fields are included
      const fullParams = {
        ...params,
        deduplication_keys: params.deduplication_keys || [],
        tags: params.tags || [],
      };

      const result = await service.createTransferRequest(stationPrincipal, fullParams);
      return parseOrbitResponse(result);
    },
    onSuccess: () => {
      // Invalidate requests to trigger refresh
      queryClient.invalidateQueries(['orbitRequests']);
    },
  });
};

export const useApproveRequest = (stationId, identity) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId) => {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.approveOrbitRequest(stationPrincipal, requestId);
      return parseOrbitResponse(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orbitRequests']);
    },
  });
};

export const useRejectRequest = (stationId, identity) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId) => {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.rejectOrbitRequest(stationPrincipal, requestId);
      return parseOrbitResponse(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orbitRequests']);
    },
  });
};