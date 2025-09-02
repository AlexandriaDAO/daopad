import { createSlice } from '@reduxjs/toolkit';
import { fetchLpLockerData } from './lpLockerThunks';

const initialState = {
  // Balance data
  icpBalance: '0.00',
  votingPower: '0',  // User's voting power from locked LP
  
  // LP position data (no longer from backend, placeholder for KongSwap data)
  lpPositions: [],  // Empty - would need direct KongSwap integration
  
  // Lock canister data
  lockCanister: null,           // Principal string or null
  lockCanisterStatus: 'none',  // 'none' | 'created' | 'registered'
  lockingInProgress: false,    // Boolean for UI loading state
  
  // Loading states
  isLoading: false,
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
    setLockCanister: (state, action) => {
      state.lockCanister = action.payload;
    },
    setLockCanisterStatus: (state, action) => {
      state.lockCanisterStatus = action.payload;
    },
    setLockingInProgress: (state, action) => {
      state.lockingInProgress = action.payload;
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
      });
  },
});

export const {
  clearLpLockerData,
  setMessage,
  clearMessage,
  setLockCanister,
  setLockCanisterStatus,
  setLockingInProgress,
} = lpLockerSlice.actions;

export default lpLockerSlice.reducer;