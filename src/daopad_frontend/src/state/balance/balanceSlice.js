import { createSlice } from '@reduxjs/toolkit';
import { fetchBalances, fetchAlexandriaBalances } from './balanceThunks';

const initialState = {
  icpBalance: '0.00',
  alexBalance: '0.00',
  stakedAlexBalance: '0.00',
  kongPrincipal: null,
  isKongLinked: false,
  lpVotingPower: {}, // { "ckBTC_ckUSDT": "0.00", ... }
  totalLpVotingPower: '0.00',
  isLoading: false,
  isLoadingAlexandria: false,
  error: null,
};

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    clearBalances: (state) => {
      state.icpBalance = '0.00';
      state.alexBalance = '0.00';
      state.stakedAlexBalance = '0.00';
      state.kongPrincipal = null;
      state.isKongLinked = false;
      state.lpVotingPower = {};
      state.totalLpVotingPower = '0.00';
      state.error = null;
    },
    setKongPrincipal: (state, action) => {
      state.kongPrincipal = action.payload;
      state.isKongLinked = !!action.payload;
    },
    clearAlexandriaBalances: (state) => {
      state.alexBalance = '0.00';
      state.stakedAlexBalance = '0.00';
      state.lpVotingPower = {};
      state.totalLpVotingPower = '0.00';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalances.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBalances.fulfilled, (state, action) => {
        state.isLoading = false;
        state.icpBalance = action.payload.icpBalance;
        state.alexBalance = action.payload.alexBalance;
        state.stakedAlexBalance = action.payload.stakedAlexBalance;
      })
      .addCase(fetchBalances.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Alexandria-specific balance fetching
      .addCase(fetchAlexandriaBalances.pending, (state) => {
        state.isLoadingAlexandria = true;
        state.error = null;
      })
      .addCase(fetchAlexandriaBalances.fulfilled, (state, action) => {
        state.isLoadingAlexandria = false;
        state.alexBalance = action.payload.alexBalance;
        state.stakedAlexBalance = action.payload.stakedAlexBalance;
        state.kongPrincipal = action.payload.kongPrincipal;
        state.isKongLinked = action.payload.isKongLinked;
        state.lpVotingPower = action.payload.lpVotingPower;
        state.totalLpVotingPower = action.payload.totalLpVotingPower;
      })
      .addCase(fetchAlexandriaBalances.rejected, (state, action) => {
        state.isLoadingAlexandria = false;
        state.error = action.payload;
      });
  },
});

export const { clearBalances, setKongPrincipal, clearAlexandriaBalances } = balanceSlice.actions;
export default balanceSlice.reducer;