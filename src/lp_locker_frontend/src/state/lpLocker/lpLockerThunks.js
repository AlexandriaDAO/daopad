import { createAsyncThunk } from '@reduxjs/toolkit';
import { Principal } from '@dfinity/principal';
import { createLpLockerService, e8sToDisplay } from '../../services/lpLockerService';

// Fetch all LP locker data
export const fetchLpLockerData = createAsyncThunk(
  'lpLocker/fetchLpLockerData',
  async (identity, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { principal } = state.auth;

      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }

      const service = createLpLockerService(identity);
      const userPrincipal = Principal.fromText(principal);

      // Fetch all data in parallel
      const [
        icpBalance,
        votingPower,
        allVotingPowers,
        lpPositions,
        isRegisteredWithKong
      ] = await Promise.all([
        service.getIcpBalance(userPrincipal),
        service.getVotingPower(),
        service.getAllVotingPowers(),
        service.getLpPositions(),
        service.checkKongSwapRegistration(principal)
      ]);

      return {
        icpBalance: e8sToDisplay(icpBalance),
        votingPower,
        allVotingPowers,
        lpPositions,
        isRegisteredWithKong,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Sync voting power with LP tokens
export const syncVotingPower = createAsyncThunk(
  'lpLocker/syncVotingPower',
  async (identity, { getState, rejectWithValue }) => {
    try {
      const service = createLpLockerService(identity);
      
      // Sync voting power (this is an update call)
      const newVotingPower = await service.syncVotingPower();
      
      // Fetch updated all voting powers and LP positions (query calls)
      const [allVotingPowers, lpPositions] = await Promise.all([
        service.getAllVotingPowers(),
        service.getLpPositions()
      ]);

      return {
        votingPower: newVotingPower,
        allVotingPowers,
        lpPositions,
        message: `LP positions synced: ${lpPositions.length} pools`,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Register with KongSwap through backend
export const registerWithKongSwap = createAsyncThunk(
  'lpLocker/registerWithKongSwap',
  async (identity, { getState, dispatch, rejectWithValue }) => {
    try {
      const service = createLpLockerService(identity);
      
      // Call backend registration method
      const registrationResult = await service.registerWithKongSwap();
      
      // Refresh all data after successful registration
      await dispatch(fetchLpLockerData(identity));
      
      return {
        registrationResult,
        message: 'Successfully registered with KongSwap!',
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);