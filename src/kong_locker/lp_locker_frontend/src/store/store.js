import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../features/auth/authSlice';
import lpLockerSlice from '../state/lpLocker/lpLockerSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    lpLocker: lpLockerSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.identity', 'meta.arg.identity'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.identity'],
      },
    }),
});