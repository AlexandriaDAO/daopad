import { createAsyncThunk } from '@reduxjs/toolkit';
import { Principal } from '@dfinity/principal';
import { createLpLockerService, e8sToDisplay } from '../../services/lpLockerService';
import { setLockCanister, setLockCanisterStatus, setLockingInProgress } from './lpLockerSlice';

// Fetch all LP locker data
export const fetchLpLockerData = createAsyncThunk(
  'lpLocker/fetchLpLockerData',
  async (identity, { getState, rejectWithValue, dispatch }) => {
    try {
      const state = getState();
      const { principal } = state.auth;

      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }

      const service = createLpLockerService(identity);
      const userPrincipal = Principal.fromText(principal);

      const [
        icpBalance,
        lockCanister,
        votingPower
      ] = await Promise.all([
        service.getIcpBalance(userPrincipal),
        service.getMyLockCanister(),
        service.getVotingPower(userPrincipal)
      ]);

      console.log('🔍 DEBUG: lockCanister from factory:', lockCanister);

      // ADD THESE LINES:
      if (lockCanister) {
        // Convert Principal object to string properly
        const lockCanisterPrincipal = typeof lockCanister === 'string' 
          ? lockCanister 
          : lockCanister.toText(); // Use toText() instead of toString()
        
        console.log('🔍 DEBUG: Converted principal:', lockCanisterPrincipal);
        dispatch(setLockCanister(lockCanisterPrincipal));
        
        // Check actual registration status
        try {
          const status = await service.checkLockCanisterStatus(lockCanisterPrincipal);
          if (status.hasICP) {
            // Has ICP, assume it's at least created and funded, might be registered
            dispatch(setLockCanisterStatus('registered')); // TODO: Could check KongSwap directly
          } else {
            // No ICP, just created but not funded
            dispatch(setLockCanisterStatus('created'));
          }
        } catch (error) {
          console.log('🔍 DEBUG: Status check failed:', error);
          // If we can't check status, assume it needs funding
          dispatch(setLockCanisterStatus('created'));
        }
      } else {
        // No lock canister exists, clear any cached state
        dispatch(setLockCanister(null));
        dispatch(setLockCanisterStatus('none'));
      }

      return {
        icpBalance: e8sToDisplay(icpBalance),
        votingPower: votingPower.toString(),
        lpPositions: [], // No longer fetched from backend
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createLockCanister = createAsyncThunk(
  'lpLocker/createLockCanister',
  async (identity, { dispatch, rejectWithValue }) => {
    try {
      const service = createLpLockerService(identity);
      const lockCanisterPrincipal = await service.createLockCanister();
      
      dispatch(setLockCanister(lockCanisterPrincipal.toString()));
      dispatch(setLockCanisterStatus('created'));
      
      return lockCanisterPrincipal.toString();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fundAndRegisterLockCanister = createAsyncThunk(
  'lpLocker/fundAndRegisterLockCanister',
  async ({ identity, lockCanisterPrincipal, amountIcp }, { dispatch, rejectWithValue }) => {
    try {
      const service = createLpLockerService(identity);
      
      // Step 1: Fund with ICP
      await service.fundLockCanister(lockCanisterPrincipal, amountIcp);
      
      // Step 2: Register with KongSwap
      await service.registerLockCanister(lockCanisterPrincipal);
      
      dispatch(setLockCanisterStatus('registered'));
      
      return 'Registration successful';
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

