import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import balanceReducer from '../state/balance/balanceSlice';
import daoReducer from '../features/dao/daoSlice';
import stationReducer from '../features/station/stationSlice';
import orbitReducer from '../features/orbit/orbitSlice';
import tokenReducer from '../features/token/tokenSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        balance: balanceReducer,
        dao: daoReducer,
        station: stationReducer,
        orbit: orbitReducer,
        token: tokenReducer,
    },
    // Add middleware for better debugging
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types (Principal objects)
                ignoredActions: [
                    'orbit/fetchVotingPower/fulfilled',
                    'orbit/fetchRequests/fulfilled',
                    'orbit/fetchMembers/fulfilled',
                    'orbit/fetchAccounts/fulfilled',
                    'orbit/fetchStationStatus/fulfilled',
                    'token/fetchMetadata/fulfilled'
                ],
            },
        }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;