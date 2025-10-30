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
        // sort_by removed - backend uses () (unit type) for Candid 0.10.18 compatibility
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

// Fetch Orbit accounts with multi-asset balances (NEW: uses efficient backend method)
export const fetchOrbitAccounts = createAsyncThunk(
  'orbit/fetchAccounts',
  async ({ stationId, identity, tokenId }, { rejectWithValue }) => {
    try {
      const service = getOrbitAccountsService(identity);

      // Use new efficient method that fetches all accounts with balances in one call
      const response = await service.getTreasuryAccountsWithBalances(tokenId);

      if (response.success) {
        const accounts = response.data || [];

        // Process accounts to ensure balance data is properly formatted
        const processedAccounts = accounts.map(account => ({
          ...account,
          assets: (account.assets || []).map(accountAsset => {
            // AccountAssetWithBalance has direct balance object (non-optional)
            // backend returns: { asset_id: "...", balance: { account_id, balance, decimals, ... } }
            if (accountAsset.balance) {
              const bal = accountAsset.balance;
              let balanceValue = 0n;

              try {
                if (typeof bal.balance === 'bigint') {
                  balanceValue = bal.balance;
                } else if (typeof bal.balance === 'string' && bal.balance) {
                  balanceValue = BigInt(bal.balance);
                } else if (typeof bal.balance === 'number') {
                  balanceValue = BigInt(Math.floor(bal.balance));
                } else if (bal.balance && typeof bal.balance === 'object' && '_0_' in bal.balance) {
                  // Handle Candid Nat encoding
                  balanceValue = BigInt(bal.balance._0_.toString());
                }
              } catch (e) {
                console.warn(`Invalid balance for asset ${accountAsset.asset_id}:`, bal.balance, e);
              }

              return {
                asset_id: accountAsset.asset_id,
                balance: balanceValue,
                decimals: bal.decimals || 8,
                query_state: bal.query_state || 'unknown',
                last_update_timestamp: bal.last_update_timestamp,
              };
            }

            // No balance data available (shouldn't happen with new backend)
            return {
              asset_id: accountAsset.asset_id,
              balance: 0n,
              decimals: 8,
              query_state: 'missing',
            };
          })
        }));

        return { stationId, tokenId, data: { accounts: processedAccounts, total: processedAccounts.length } };
      }
      throw new Error(response.error || 'Failed to fetch accounts');
    } catch (error) {
      console.error('Failed to fetch treasury accounts:', error);
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

// Fetch available treasury assets
export const fetchTreasuryAssets = createAsyncThunk(
  'orbit/fetchAssets',
  async ({ tokenId, identity }, { rejectWithValue }) => {
    try {
      const service = getOrbitAccountsService(identity);

      const response = await service.listTreasuryAssets(tokenId);

      if (response.success) {
        return { tokenId, data: response.data || [] };
      }
      throw new Error(response.error || 'Failed to fetch treasury assets');
    } catch (error) {
      console.error('Failed to fetch treasury assets:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Refresh treasury account balances by calling Orbit's fetch_account_balances
export const refreshAccountBalances = createAsyncThunk(
  'orbit/refreshBalances',
  async ({ stationId, tokenId, identity, accountIds }, { rejectWithValue, dispatch }) => {
    try {
      const service = getOrbitAccountsService(identity);

      // Step 1: Trigger fresh balance fetch at Orbit level
      const refreshResponse = await service.fetchBalances(stationId, accountIds);

      if (!refreshResponse.success) {
        throw new Error(refreshResponse.error || 'Failed to refresh balances');
      }

      // Step 2: Re-fetch accounts to get updated balance data
      await dispatch(fetchOrbitAccounts({ stationId, identity, tokenId })).unwrap();

      return { stationId, tokenId, refreshedCount: accountIds.length };
    } catch (error) {
      console.error('Failed to refresh account balances:', error);
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

  // Treasury Assets (keyed by tokenId)
  assets: {
    data: {}, // tokenId -> array of assets
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

    // Treasury Assets
    builder
      .addCase(fetchTreasuryAssets.pending, (state, action) => {
        const { tokenId } = action.meta.arg;
        state.assets.loading[tokenId] = true;
        state.assets.error[tokenId] = null;
      })
      .addCase(fetchTreasuryAssets.fulfilled, (state, action) => {
        const { tokenId, data } = action.payload;
        state.assets.data[tokenId] = data;
        state.assets.loading[tokenId] = false;
        state.assets.lastFetch[tokenId] = Date.now();
      })
      .addCase(fetchTreasuryAssets.rejected, (state, action) => {
        const { tokenId } = action.meta.arg;
        state.assets.loading[tokenId] = false;
        state.assets.error[tokenId] = action.payload;
      });

    // Refresh Account Balances
    builder
      .addCase(refreshAccountBalances.pending, (state, action) => {
        const { stationId } = action.meta.arg;
        state.accounts.loading[stationId] = true;
        state.accounts.error[stationId] = null;
      })
      .addCase(refreshAccountBalances.fulfilled, (state, action) => {
        const { stationId } = action.payload;
        // Don't clear loading - fetchOrbitAccounts will handle it
        // Just ensure we don't have stale error
        state.accounts.error[stationId] = null;
      })
      .addCase(refreshAccountBalances.rejected, (state, action) => {
        const { stationId } = action.meta.arg;
        state.accounts.loading[stationId] = false;
        state.accounts.error[stationId] = action.payload;
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
