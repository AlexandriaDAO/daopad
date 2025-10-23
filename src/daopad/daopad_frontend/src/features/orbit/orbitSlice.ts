import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getKongLockerService,
  getOrbitRequestsService,
  getOrbitAccountsService,
  getTokenService,
  getProposalService
} from '../../services/backend';
import { Principal } from '@dfinity/principal';

// ==================== ASYNC THUNKS ====================

// Fetch voting power for a token
export const fetchVotingPower = createAsyncThunk(
  'orbit/fetchVotingPower',
  async ({ tokenId, identity }, { rejectWithValue }) => {
    try {
      const service = getKongLockerService(identity);
      const result = await service.getVotingPower(tokenId);

      if (result.success) {
        return { tokenId, votingPower: result.data };
      }
      throw new Error(result.error || 'Failed to fetch voting power');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch Orbit requests with filters
export const fetchOrbitRequests = createAsyncThunk(
  'orbit/fetchRequests',
  async ({ tokenId, stationId, filters, identity }, { rejectWithValue }) => {
    try {
      const service = getOrbitRequestsService(identity);

      const requestInput = {
        statuses: filters.statuses || ['Created', 'Approved', 'Processing', 'Scheduled'],
        deduplication_keys: [],
        tags: [],
        only_approvable: filters.only_approvable || false,
        created_from: filters.created_from || null,
        created_to: filters.created_to || null,
        expiration_from: filters.expiration_from || null,
        expiration_to: filters.expiration_to || null,
        sort_by: filters.sort_by || { field: 'ExpirationDt', direction: 'Asc' },
        page: filters.page || 0,
        limit: filters.limit || 20,
      };

      const result = await service.listRequests(stationId, requestInput);

      if (result.success) {
        return { tokenId, stationId, data: result.data };
      }
      throw new Error(result.error || 'Failed to fetch requests');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch Orbit accounts with balances
export const fetchOrbitAccounts = createAsyncThunk(
  'orbit/fetchAccounts',
  async ({ stationId, identity, searchQuery, pagination, tokenId }, { rejectWithValue }) => {
    try {
      const service = getOrbitAccountsService(identity);

      const response = await service.listAccounts(
        tokenId,
        searchQuery || undefined,
        pagination.limit || 20,
        pagination.offset || 0
      );

      if (response.success) {
        const accounts = response.data.accounts || [];

        // NEW: Fetch asset details with correct symbols for each account
        if (accounts.length > 0 && tokenId) {
          const enrichedAccounts = await Promise.all(
            accounts.map(async (account) => {
              try {
                const assetsResult = await service.getAccountWithAssets(
                  tokenId,
                  account.id
                );

                if (assetsResult.success && assetsResult.data) {
                  // Map assets to the format expected by selectors
                  const assetsWithSymbols = assetsResult.data.assets.map(asset => {
                    // Handle balance conversion safely
                    let balanceValue = 0n;
                    try {
                      if (typeof asset.balance === 'bigint') {
                        balanceValue = asset.balance;
                      } else if (typeof asset.balance === 'string' && asset.balance) {
                        balanceValue = BigInt(asset.balance);
                      } else if (typeof asset.balance === 'number') {
                        balanceValue = BigInt(Math.floor(asset.balance));
                      }
                    } catch (e) {
                      console.warn(`Invalid balance for asset ${asset.asset_id}:`, asset.balance, e);
                      balanceValue = 0n;
                    }

                    return {
                      id: asset.asset_id,
                      asset_id: asset.asset_id,
                      symbol: asset.symbol,
                      decimals: asset.decimals,
                      balance: {
                        balance: balanceValue,
                        decimals: asset.decimals,
                        asset_id: asset.asset_id,
                      }
                    };
                  });

                  return {
                    ...account,
                    assets: assetsWithSymbols,
                  };
                }
              } catch (error) {
                console.warn(`Failed to get assets for account ${account.id}:`, error);
              }

              // Fallback to original account if enrichment fails
              return account;
            })
          );

          response.data.accounts = enrichedAccounts;
        }

        return { stationId, data: response.data };
      }
      throw new Error(response.error || 'Failed to fetch accounts');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch station status for token
export const fetchOrbitStationStatus = createAsyncThunk(
  'orbit/fetchStationStatus',
  async ({ tokenId, identity }, { rejectWithValue }) => {
    try {
      const tokenService = getTokenService(identity);
      const proposalService = getProposalService(identity);
      const accountsService = getOrbitAccountsService(identity);

      const stationResult = await tokenService.getStationForToken(tokenId);
      if (stationResult.success && stationResult.data) {
        const stationText = typeof stationResult.data === 'string'
          ? stationResult.data
          : stationResult.data.toString();

        return {
          tokenId,
          station_id: stationText,
          status: 'linked',
        };
      }

      // Check for active proposal
      const proposalResult = await proposalService.getActiveForToken(tokenId);
      if (proposalResult.success && proposalResult.data) {
        return {
          tokenId,
          activeProposal: proposalResult.data,
          status: 'proposal',
        };
      }

      return { tokenId, status: 'missing' };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create transfer request (mutation)
export const createTransferRequest = createAsyncThunk(
  'orbit/createTransferRequest',
  async ({ tokenId, stationId, identity, params }, { rejectWithValue, dispatch }) => {
    try {
      const service = getOrbitRequestsService(identity);

      const fullParams = {
        ...params,
        deduplication_keys: params.deduplication_keys || [],
        tags: params.tags || [],
      };

      const result = await service.createTransfer(stationId, fullParams);

      // Parse Orbit's double-wrapped Result
      let parsedResult;
      if (result?.Ok) {
        if (result.Ok.Ok) {
          parsedResult = { success: true, data: result.Ok.Ok };
        } else if (result.Ok.Err) {
          parsedResult = { success: false, error: result.Ok.Err };
        }
      } else if (result?.success !== undefined) {
        parsedResult = result;
      } else {
        parsedResult = { success: false, error: 'Invalid response structure' };
      }

      if (parsedResult.success) {
        // Trigger requests refetch
        dispatch(fetchOrbitRequests({
          tokenId,
          stationId,
          identity,
          filters: {}
        }));
        return parsedResult.data;
      }

      throw new Error(parsedResult.error || 'Failed to create transfer request');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ❌ REMOVED: Direct approval/rejection (replaced by liquid democracy voting)
// Use voteOnOrbitRequest in components instead

// ==================== INITIAL STATE ====================

const initialState = {
  // Voting Power (keyed by tokenId)
  votingPower: {
    data: {}, // tokenId -> power value
    loading: {},
    error: {},
    lastFetch: {},
  },

  // Requests (keyed by stationId)
  requests: {
    data: {}, // stationId -> { requests, total }
    loading: {},
    error: {},
    lastFetch: {},
    filters: {}, // Track active filters per station
  },

  // Accounts (keyed by stationId)
  accounts: {
    data: {}, // stationId -> { accounts, total, balances }
    loading: {},
    error: {},
    lastFetch: {},
  },

  // Station Status (keyed by tokenId)
  stationStatus: {
    data: {}, // tokenId -> { station_id?, status, activeProposal? }
    loading: {},
    error: {},
    lastFetch: {},
  },

  // Mutations state
  mutations: {
    createTransfer: {
      loading: false,
      error: null,
      lastSuccess: null,
    },
    // approveRequest & rejectRequest removed - use voting instead
  },
};

// ==================== SLICE ====================

const orbitSlice = createSlice({
  name: 'orbit',
  initialState,
  reducers: {
    // Clear specific resource
    clearVotingPower: (state, action) => {
      const tokenId = action.payload;
      delete state.votingPower.data[tokenId];
      delete state.votingPower.loading[tokenId];
      delete state.votingPower.error[tokenId];
      delete state.votingPower.lastFetch[tokenId];
    },
    clearRequests: (state, action) => {
      const stationId = action.payload;
      delete state.requests.data[stationId];
      delete state.requests.loading[stationId];
      delete state.requests.error[stationId];
      delete state.requests.lastFetch[stationId];
      delete state.requests.filters[stationId];
    },
    // Clear ALL Orbit state
    clearOrbitState: () => initialState,

    // Update filters for requests
    setRequestFilters: (state, action) => {
      const { stationId, filters } = action.payload;
      state.requests.filters[stationId] = filters;
    },
  },
  extraReducers: (builder) => {
    // Voting Power
    builder
      .addCase(fetchVotingPower.pending, (state, action) => {
        const { tokenId } = action.meta.arg;
        state.votingPower.loading[tokenId] = true;
        state.votingPower.error[tokenId] = null;
      })
      .addCase(fetchVotingPower.fulfilled, (state, action) => {
        const { tokenId, votingPower } = action.payload;
        state.votingPower.data[tokenId] = votingPower;
        state.votingPower.loading[tokenId] = false;
        state.votingPower.lastFetch[tokenId] = Date.now();
      })
      .addCase(fetchVotingPower.rejected, (state, action) => {
        const { tokenId } = action.meta.arg;
        state.votingPower.loading[tokenId] = false;
        state.votingPower.error[tokenId] = action.payload;
      });

    // Requests
    builder
      .addCase(fetchOrbitRequests.pending, (state, action) => {
        const { stationId } = action.meta.arg;
        state.requests.loading[stationId] = true;
        state.requests.error[stationId] = null;
      })
      .addCase(fetchOrbitRequests.fulfilled, (state, action) => {
        const { stationId, data } = action.payload;
        state.requests.data[stationId] = data;
        state.requests.loading[stationId] = false;
        state.requests.lastFetch[stationId] = Date.now();
      })
      .addCase(fetchOrbitRequests.rejected, (state, action) => {
        const { stationId } = action.meta.arg;
        state.requests.loading[stationId] = false;
        state.requests.error[stationId] = action.payload;
      });

    // Accounts
    builder
      .addCase(fetchOrbitAccounts.pending, (state, action) => {
        const { stationId } = action.meta.arg;
        state.accounts.loading[stationId] = true;
        state.accounts.error[stationId] = null;
      })
      .addCase(fetchOrbitAccounts.fulfilled, (state, action) => {
        const { stationId, data } = action.payload;
        state.accounts.data[stationId] = data;
        state.accounts.loading[stationId] = false;
        state.accounts.lastFetch[stationId] = Date.now();
      })
      .addCase(fetchOrbitAccounts.rejected, (state, action) => {
        const { stationId } = action.meta.arg;
        state.accounts.loading[stationId] = false;
        state.accounts.error[stationId] = action.payload;
      });

    // Station Status
    builder
      .addCase(fetchOrbitStationStatus.pending, (state, action) => {
        const { tokenId } = action.meta.arg;
        state.stationStatus.loading[tokenId] = true;
        state.stationStatus.error[tokenId] = null;
      })
      .addCase(fetchOrbitStationStatus.fulfilled, (state, action) => {
        const { tokenId, ...statusData } = action.payload;
        state.stationStatus.data[tokenId] = statusData;
        state.stationStatus.loading[tokenId] = false;
        state.stationStatus.lastFetch[tokenId] = Date.now();
      })
      .addCase(fetchOrbitStationStatus.rejected, (state, action) => {
        const { tokenId } = action.meta.arg;
        state.stationStatus.loading[tokenId] = false;
        state.stationStatus.error[tokenId] = action.payload;
      });

    // Create Transfer Request
    builder
      .addCase(createTransferRequest.pending, (state) => {
        state.mutations.createTransfer.loading = true;
        state.mutations.createTransfer.error = null;
      })
      .addCase(createTransferRequest.fulfilled, (state, action) => {
        state.mutations.createTransfer.loading = false;
        state.mutations.createTransfer.lastSuccess = Date.now();
      })
      .addCase(createTransferRequest.rejected, (state, action) => {
        state.mutations.createTransfer.loading = false;
        state.mutations.createTransfer.error = action.payload;
      });

    // Approve/Reject Request handlers removed - use voting instead
  },
});

// ==================== ACTIONS ====================

export const {
  clearVotingPower,
  clearRequests,
  clearOrbitState,
  setRequestFilters,
} = orbitSlice.actions;

// ==================== SELECTORS ====================

// Voting Power selectors
export const selectVotingPowerData = (state, tokenId) =>
  state.orbit.votingPower.data[tokenId];
export const selectVotingPowerLoading = (state, tokenId) =>
  state.orbit.votingPower.loading[tokenId] || false;
export const selectVotingPowerError = (state, tokenId) =>
  state.orbit.votingPower.error[tokenId];

// Requests selectors
export const selectOrbitRequests = (state, stationId) =>
  state.orbit.requests.data[stationId] || { requests: [], total: 0 };
export const selectOrbitRequestsLoading = (state, stationId) =>
  state.orbit.requests.loading[stationId] || false;
export const selectOrbitRequestsError = (state, stationId) =>
  state.orbit.requests.error[stationId];
export const selectRequestFilters = (state, stationId) =>
  state.orbit.requests.filters[stationId] || {};

// Accounts selectors
export const selectOrbitAccounts = (state, stationId) =>
  state.orbit.accounts.data[stationId] || { accounts: [], total: 0, balances: {} };
export const selectOrbitAccountsLoading = (state, stationId) =>
  state.orbit.accounts.loading[stationId] || false;
export const selectOrbitAccountsError = (state, stationId) =>
  state.orbit.accounts.error[stationId];

// Station Status selectors
export const selectStationStatus = (state, tokenId) =>
  state.orbit.stationStatus.data[tokenId] || { status: 'unknown' };
export const selectStationStatusLoading = (state, tokenId) =>
  state.orbit.stationStatus.loading[tokenId] || false;
export const selectStationStatusError = (state, tokenId) =>
  state.orbit.stationStatus.error[tokenId];

// Mutations selectors
export const selectCreateTransferLoading = (state) =>
  state.orbit.mutations.createTransfer.loading;
export const selectCreateTransferError = (state) =>
  state.orbit.mutations.createTransfer.error;
// Approve/Reject selectors removed - use voting instead

export default orbitSlice.reducer;
