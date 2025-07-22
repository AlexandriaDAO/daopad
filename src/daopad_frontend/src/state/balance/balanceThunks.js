import { createAsyncThunk } from '@reduxjs/toolkit';
import { Principal } from '@dfinity/principal';
import { createBalanceService, e8sToDisplay } from '../../services/balanceService';

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

      // Fetch all balances in parallel
      const [icpBalance, alexBalance, stakedAlexBalance] = await Promise.all([
        balanceService.getIcpBalance(userPrincipal),
        balanceService.getAlexBalance(userPrincipal),
        balanceService.getStakedAlexBalance(userPrincipal),
      ]);

      return {
        icpBalance: e8sToDisplay(icpBalance),
        alexBalance: e8sToDisplay(alexBalance),
        stakedAlexBalance: e8sToDisplay(stakedAlexBalance),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);