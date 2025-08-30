import { createSlice } from '@reduxjs/toolkit';
import { fetchLpLockerData, syncVotingPower } from './lpLockerThunks';

const initialState = {
  // Balance data
  icpBalance: '0.00',
  
  // LP Locker data
  votingPower: 0,
  allVotingPowers: [],
  lpPositions: [],  // Detailed LP position data
  
  // KongSwap data
  isRegisteredWithKong: false,
  
  // Loading states
  isLoading: false,
  isSyncing: false,
  error: null,
  message: '',
};

const lpLockerSlice = createSlice({
  name: 'lpLocker',
  initialState,
  reducers: {
    clearLpLockerData: (state) => {
      return initialState;
    },
    setMessage: (state, action) => {
      state.message = action.payload;
    },
    clearMessage: (state) => {
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch LP Locker Data
      .addCase(fetchLpLockerData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.message = '';
      })
      .addCase(fetchLpLockerData.fulfilled, (state, action) => {
        state.isLoading = false;
        Object.assign(state, action.payload);
      })
      .addCase(fetchLpLockerData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Sync Voting Power
      .addCase(syncVotingPower.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
        state.message = '';
      })
      .addCase(syncVotingPower.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.votingPower = action.payload.votingPower;
        state.allVotingPowers = action.payload.allVotingPowers;
        state.lpPositions = action.payload.lpPositions;
        state.message = action.payload.message;
      })
      .addCase(syncVotingPower.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearLpLockerData,
  setMessage,
  clearMessage,
} = lpLockerSlice.actions;

export default lpLockerSlice.reducer;