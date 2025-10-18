import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Principal } from '@dfinity/principal';

// Define the auth state interface
export interface AuthState {
    principal: Principal | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;
}

// Define the initial state using the AuthState interface
const initialState: AuthState = {
    principal: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isInitialized: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuthLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setAuthError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        setAuthInitialized: (state, action: PayloadAction<boolean>) => {
            state.isInitialized = action.payload;
            if (action.payload) {
                if (state.isLoading && !state.principal) {
                    // If still loading but no principal, implies init check failed or user not logged in.
                }
            }
        },
        setAuthSuccess: (state, action: PayloadAction<Principal>) => {
            state.principal = action.payload;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.error = null;
        },
        clearAuth: (state) => {
            state.principal = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
        },
    },
});

export const { 
    setAuthLoading, 
    setAuthError, 
    setAuthInitialized, 
    setAuthSuccess, 
    clearAuth 
} = authSlice.actions;

export default authSlice.reducer;