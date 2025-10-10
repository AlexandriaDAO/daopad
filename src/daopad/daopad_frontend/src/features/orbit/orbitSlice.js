import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { DAOPadBackendService } from '../../services/daopadBackend';
import { Principal } from '@dfinity/principal';

// ==================== ASYNC THUNKS ====================

// Fetch voting power for a token
export const fetchVotingPower = createAsyncThunk(
  'orbit/fetchVotingPower',
  async ({ tokenId, identity }, { rejectWithValue }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);
      const result = await service.getMyVotingPowerForToken(tokenPrincipal);

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
      const service = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);

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

      const result = await service.listOrbitRequests(tokenPrincipal, requestInput);

      if (result.success) {
        return { tokenId, stationId, data: result.data };
      }
      throw new Error(result.error || 'Failed to fetch requests');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch Orbit members
export const fetchOrbitMembers = createAsyncThunk(
  'orbit/fetchMembers',
  async ({ stationId, identity }, { rejectWithValue }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);
      const result = await service.listOrbitMembers(stationPrincipal);

      if (result.success) {
        return { stationId, data: result.data };
      }
      throw new Error(result.error || 'Failed to fetch members');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch Orbit accounts with balances
export const fetchOrbitAccounts = createAsyncThunk(
  'orbit/fetchAccounts',
  async ({ stationId, identity, searchQuery, pagination }, { rejectWithValue }) => {
    try {
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
      const service = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);

      const stationResult = await service.getOrbitStationForToken(tokenPrincipal);
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
      const proposalResult = await service.getActiveProposalForToken(tokenPrincipal);
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
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const fullParams = {
        ...params,
        deduplication_keys: params.deduplication_keys || [],
        tags: params.tags || [],
      };

      const result = await service.createTransferRequest(stationPrincipal, fullParams);

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

// Approve request (mutation)
export const approveOrbitRequest = createAsyncThunk(
  'orbit/approveRequest',
  async ({ tokenId, stationId, identity, requestId }, { rejectWithValue, dispatch }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.approveOrbitRequest(stationPrincipal, requestId);

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

      throw new Error(parsedResult.error || 'Failed to approve request');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Reject request (mutation)
export const rejectOrbitRequest = createAsyncThunk(
  'orbit/rejectRequest',
  async ({ tokenId, stationId, identity, requestId }, { rejectWithValue, dispatch }) => {
    try {
      const service = new DAOPadBackendService(identity);
      const stationPrincipal = Principal.fromText(stationId);

      const result = await service.rejectOrbitRequest(stationPrincipal, requestId);

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

      throw new Error(parsedResult.error || 'Failed to reject request');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

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

  // Members (keyed by stationId)
  members: {
    data: {}, // stationId -> { members, total }
    loading: {},
    error: {},
    lastFetch: {},
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
    approveRequest: {
      loading: false,
      error: null,
      lastSuccess: null,
    },
    rejectRequest: {
      loading: false,
      error: null,
      lastSuccess: null,
    },
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

    // Members
    builder
      .addCase(fetchOrbitMembers.pending, (state, action) => {
        const { stationId } = action.meta.arg;
        state.members.loading[stationId] = true;
        state.members.error[stationId] = null;
      })
      .addCase(fetchOrbitMembers.fulfilled, (state, action) => {
        const { stationId, data } = action.payload;
        state.members.data[stationId] = data;
        state.members.loading[stationId] = false;
        state.members.lastFetch[stationId] = Date.now();
      })
      .addCase(fetchOrbitMembers.rejected, (state, action) => {
        const { stationId } = action.meta.arg;
        state.members.loading[stationId] = false;
        state.members.error[stationId] = action.payload;
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

    // Approve Request
    builder
      .addCase(approveOrbitRequest.pending, (state) => {
        state.mutations.approveRequest.loading = true;
        state.mutations.approveRequest.error = null;
      })
      .addCase(approveOrbitRequest.fulfilled, (state) => {
        state.mutations.approveRequest.loading = false;
        state.mutations.approveRequest.lastSuccess = Date.now();
      })
      .addCase(approveOrbitRequest.rejected, (state, action) => {
        state.mutations.approveRequest.loading = false;
        state.mutations.approveRequest.error = action.payload;
      });

    // Reject Request
    builder
      .addCase(rejectOrbitRequest.pending, (state) => {
        state.mutations.rejectRequest.loading = true;
        state.mutations.rejectRequest.error = null;
      })
      .addCase(rejectOrbitRequest.fulfilled, (state) => {
        state.mutations.rejectRequest.loading = false;
        state.mutations.rejectRequest.lastSuccess = Date.now();
      })
      .addCase(rejectOrbitRequest.rejected, (state, action) => {
        state.mutations.rejectRequest.loading = false;
        state.mutations.rejectRequest.error = action.payload;
      });
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

// Members selectors
export const selectOrbitMembers = (state, stationId) =>
  state.orbit.members.data[stationId] || { members: [], total: 0 };
export const selectOrbitMembersLoading = (state, stationId) =>
  state.orbit.members.loading[stationId] || false;
export const selectOrbitMembersError = (state, stationId) =>
  state.orbit.members.error[stationId];

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
export const selectApproveRequestLoading = (state) =>
  state.orbit.mutations.approveRequest.loading;
export const selectApproveRequestError = (state) =>
  state.orbit.mutations.approveRequest.error;
export const selectRejectRequestLoading = (state) =>
  state.orbit.mutations.rejectRequest.loading;
export const selectRejectRequestError = (state) =>
  state.orbit.mutations.rejectRequest.error;

export default orbitSlice.reducer;
