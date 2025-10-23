import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import balanceReducer from '../state/balance/balanceSlice';
import daoReducer from '../features/dao/daoSlice';
import stationReducer from '../features/station/stationSlice';
import orbitReducer from '../features/orbit/orbitSlice';
import tokenReducer from '../features/token/tokenSlice';

// Middleware to log Redux actions for E2E testing
const actionLoggerMiddleware = () => (next: any) => (action: any) => {
    // Initialize log array if it doesn't exist
    if (typeof window !== 'undefined') {
        if (!(window as any).__REDUX_DISPATCH_LOG__) {
            (window as any).__REDUX_DISPATCH_LOG__ = [];
        }

        // Log the action
        (window as any).__REDUX_DISPATCH_LOG__.push({
            type: action.type,
            payload: action.payload,
            timestamp: Date.now()
        });

        console.log('[Redux Action]', action.type, action.payload);
    }

    return next(action);
};

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
        }).concat(actionLoggerMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;