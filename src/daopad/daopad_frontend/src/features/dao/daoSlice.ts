import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getProposalService, getTokenService, getKongLockerService } from '../../services/backend';

// Async thunk for fetching public dashboard data
export const fetchPublicDashboard = createAsyncThunk(
  'dao/fetchPublicDashboard',
  async (_, { rejectWithValue }) => {
    try {
      // Create services with null identity for anonymous access
      const proposalService = getProposalService(null);
      const tokenService = getTokenService(null);
      const kongService = getKongLockerService(null);

      // Use existing methods - no wrappers needed
      const [proposals, stations, registrations] =
        await Promise.all([
          proposalService.listActive(),
          tokenService.listAllStations(),
          kongService.listAllRegistrations()
        ]);

      const toPrincipalText = (principal) => {
        if (!principal) return null;
        if (typeof principal === 'string') return principal;
        if (typeof principal?.toText === 'function') return principal.toText();
        if (typeof principal?.toString === 'function') return principal.toString();
        return String(principal);
      };

      const treasuryPairs = stations.success
        ? (stations.data || [])
            .map(([tokenPrincipal, stationPrincipal]) => ({
              tokenId: toPrincipalText(tokenPrincipal),
              stationId: toPrincipalText(stationPrincipal),
            }))
            .filter(pair => pair.tokenId && pair.stationId)
        : [];

      const stationMappings = treasuryPairs.reduce((acc, pair) => {
        acc[pair.tokenId] = {
          stationId: pair.stationId,
          status: 'linked',
          updatedAt: Date.now(),
          source: 'publicDashboard',
        };
        return acc;
      }, {});

      return {
        stats: {
          participants: registrations.success ? registrations.data.length : 0,
          activeProposals: proposals.success ?
            proposals.data.filter(p => p.status?.Active !== undefined).length : 0,
          treasuries: treasuryPairs.length,
          registeredVoters: registrations.success ? registrations.data.length : 0,
          totalValueLocked: 0  // Would need KongSwap queries
        },
        proposals: proposals.success ? proposals.data : [],
        treasuries: treasuryPairs,
        stationMappings,
        hasErrors: !proposals.success || !stations.success || !registrations.success
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Kong Locker Canister (global for user)
  kongLockerCanister: null,
  kongLockerLoading: false,
  kongLockerError: null,

  // LP Positions and Voting Power
  lpPositions: [],
  lpPositionsLoading: false,
  lpPositionsError: null,
  votingPower: 0,

  // Orbit station mapping (token_canister_id -> station info)
  stationIndex: {},

  // System Stats
  systemStats: null,
  systemStatsLoading: false,

  // Public dashboard data (available without auth)
  publicDashboard: {
    stats: null,
    proposals: [],
    treasuries: [],
    lastUpdated: null,
    error: null,
    isLoading: false,
    hasPartialData: false
  }
};

const daoSlice = createSlice({
  name: 'dao',
  initialState,
  reducers: {
    // Kong Locker Canister actions
    setKongLockerCanister: (state, action) => {
      // Ensure we store as string, not Principal object
      const canister = action.payload;
      state.kongLockerCanister = typeof canister === 'string' ? canister : canister?.toString() || null;
      state.kongLockerError = null;
    },
    setKongLockerLoading: (state, action) => {
      state.kongLockerLoading = action.payload;
    },
    setKongLockerError: (state, action) => {
      state.kongLockerError = action.payload;
      state.kongLockerLoading = false;
    },
    
    // LP Positions actions
    setLpPositions: (state, action) => {
      state.lpPositions = action.payload;
      state.lpPositionsError = null;
      // Calculate voting power automatically
      state.votingPower = action.payload.reduce((sum, position) => {
        return sum + (position.usd_balance || 0);
      }, 0) * 100;
    },
    setLpPositionsLoading: (state, action) => {
      state.lpPositionsLoading = action.payload;
    },
    setLpPositionsError: (state, action) => {
      state.lpPositionsError = action.payload;
      state.lpPositionsLoading = false;
    },
    setVotingPower: (state, action) => {
      state.votingPower = action.payload;
    },
    
    // System Stats actions
    setSystemStats: (state, action) => {
      state.systemStats = action.payload;
    },
    setSystemStatsLoading: (state, action) => {
      state.systemStatsLoading = action.payload;
    },

    // Orbit station mapping
    upsertStationMapping: (state, action) => {
      const { tokenId, stationId, status, source, error } = action.payload || {};
      if (!tokenId) return;
      state.stationIndex[tokenId] = {
        stationId: stationId ?? null,
        status: status ?? (stationId ? 'linked' : 'missing'),
        updatedAt: Date.now(),
        source: source ?? 'manual',
        error: error ?? null,
      };
    },
    clearStationMapping: (state, action) => {
      const tokenId = action.payload;
      if (!tokenId) return;
      delete state.stationIndex[tokenId];
    },
    
    // Clear all DAO state (on logout)
    clearDaoState: (state) => {
      return initialState;
    },

    // Clear public dashboard (using spread to avoid shared reference)
    clearPublicDashboard: (state) => {
      state.publicDashboard = {
        stats: null,
        proposals: [],
        treasuries: [],
        lastUpdated: null,
        error: null,
        isLoading: false,
        hasPartialData: false
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicDashboard.pending, (state) => {
        state.publicDashboard.isLoading = true;
        state.publicDashboard.error = null;
      })
      .addCase(fetchPublicDashboard.fulfilled, (state, action) => {
        state.publicDashboard.stats = action.payload.stats;
        state.publicDashboard.proposals = action.payload.proposals;
        state.publicDashboard.treasuries = action.payload.treasuries;
        state.publicDashboard.lastUpdated = Date.now();
        state.publicDashboard.isLoading = false;
        state.publicDashboard.hasPartialData = action.payload.hasErrors;
        if (action.payload.stationMappings) {
          Object.entries(action.payload.stationMappings).forEach(([tokenId, entry]) => {
            if (!tokenId) return;
            state.stationIndex[tokenId] = {
              ...state.stationIndex[tokenId],
              ...entry,
              updatedAt: entry?.updatedAt ?? Date.now(),
            };
          });
        }
      })
      .addCase(fetchPublicDashboard.rejected, (state, action) => {
        state.publicDashboard.isLoading = false;
        state.publicDashboard.error = action.payload;
        // Keep stale data if it exists
      });
  }
});

export const {
  setKongLockerCanister,
  setKongLockerLoading,
  setKongLockerError,
  setLpPositions,
  setLpPositionsLoading,
  setLpPositionsError,
  setVotingPower,
  setSystemStats,
  setSystemStatsLoading,
  upsertStationMapping,
  clearStationMapping,
  clearDaoState,
  clearPublicDashboard,
} = daoSlice.actions;

// Selectors
export const selectPublicStats = (state) => state.dao.publicDashboard.stats;
export const selectPublicProposals = (state) => state.dao.publicDashboard.proposals;
export const selectPublicTreasuries = (state) => state.dao.publicDashboard.treasuries;
export const selectActiveProposalCount = (state) =>
  state.dao.publicDashboard.proposals.filter(
    p => p.status?.Active !== undefined
  ).length;
export const selectStationIndex = (state) => state.dao.stationIndex;
export const selectStationByToken = (state, tokenId) =>
  tokenId ? state.dao.stationIndex[tokenId] || null : null;

export default daoSlice.reducer;
