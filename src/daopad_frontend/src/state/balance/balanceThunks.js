import { createAsyncThunk } from '@reduxjs/toolkit';
import { Principal } from '@dfinity/principal';
import { createBalanceService, e8sToDisplay } from '../../services/balanceService';
import { LPLockingService, lpToDisplay } from '../../services/lpLockingService';

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
        alexBalance: '0.00', // Will be fetched when Alexandria tab is opened
        stakedAlexBalance: '0.00', // Will be fetched when Alexandria tab is opened
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch Alexandria-specific balances (called when Alexandria tab is active)
export const fetchAlexandriaBalances = createAsyncThunk(
  'balance/fetchAlexandriaBalances',
  async (identity, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { principal } = state.auth;

      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }

      const balanceService = createBalanceService(identity);
      const lpLockingService = new LPLockingService(identity);
      const userPrincipal = Principal.fromText(principal);

      // Fetch Alexandria-specific balances in parallel
      const [alexBalance, stakedAlexBalance, kongPrincipal, lpVotingPowers] = await Promise.all([
        balanceService.getAlexBalance(userPrincipal),
        balanceService.getStakedAlexBalance(userPrincipal),
        lpLockingService.getMyKongPrincipal(),
        lpLockingService.getMyAllVotingPower(),
      ]);

      // Convert LP voting powers to display format
      const lpVotingPowerMap = {};
      let totalLpAmount = 0n;
      
      for (const { token, amount } of lpVotingPowers) {
        lpVotingPowerMap[token] = lpToDisplay(amount);
        totalLpAmount += amount;
      }

      return {
        alexBalance: e8sToDisplay(alexBalance),
        stakedAlexBalance: e8sToDisplay(stakedAlexBalance),
        kongPrincipal: kongPrincipal ? kongPrincipal.toString() : null,
        isKongLinked: !!kongPrincipal,
        lpVotingPower: lpVotingPowerMap,
        totalLpVotingPower: lpToDisplay(totalLpAmount),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);