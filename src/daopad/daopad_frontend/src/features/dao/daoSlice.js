import { createSlice } from '@reduxjs/toolkit';

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
  
  // System Stats
  systemStats: null,
  systemStatsLoading: false,
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
    
    // Clear all DAO state (on logout)
    clearDaoState: (state) => {
      return initialState;
    },
  },
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
  clearDaoState,
} = daoSlice.actions;

export default daoSlice.reducer;