import { createSlice } from '@reduxjs/toolkit';
import { fetchBalances } from './balanceThunks';

const initialState = {
  icpBalance: '0.00',
  isLoading: false,
  error: null,
};

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    clearBalances: (state) => {
      state.icpBalance = '0.00';
      state.error = null;
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
      })
      .addCase(fetchBalances.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBalances } = balanceSlice.actions;
export default balanceSlice.reducer;