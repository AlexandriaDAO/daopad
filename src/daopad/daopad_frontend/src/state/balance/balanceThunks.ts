import { createAsyncThunk } from '@reduxjs/toolkit';
import { Principal } from '@dfinity/principal';
import { createBalanceService, e8sToDisplay } from '../../services/balanceService';

// Fetch only ICP balance (called on app load)
export const fetchBalances = createAsyncThunk(
  'balance/fetchBalances',
  async (identity, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { principal } = state.auth;

      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }

      const balanceService = createBalanceService(identity);
      const userPrincipal = Principal.fromText(principal);

      // Only fetch ICP balance on main app load
      const icpBalance = await balanceService.getIcpBalance(userPrincipal);

      return {
        icpBalance: e8sToDisplay(icpBalance),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);