import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  principal: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setAuthSuccess: (state, action) => {
      state.principal = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    clearAuth: (state) => {
      state.principal = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setAuthInitialized: (state, action) => {
      state.isInitialized = action.payload;
    },
  },
});

export const {
  setAuthLoading,
  setAuthSuccess,
  clearAuth,
  setAuthInitialized,
} = authSlice.actions;

export default authSlice.reducer;