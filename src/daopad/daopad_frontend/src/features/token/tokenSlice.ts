import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UtilityService } from '../../services/backend';
import type { TokenMetadata } from '../../types';
import type { Principal } from '@dfinity/principal';

// Token state interface
export interface TokenState {
  metadata: Record<string, TokenMetadata>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  lastFetch: Record<string, number>;
}

interface FetchTokenMetadataArgs {
  tokenId: Principal | string;
}

interface FetchTokenMetadataResult {
  tokenId: string;
  metadata: TokenMetadata;
}

// Fetch token metadata
export const fetchTokenMetadata = createAsyncThunk<
  FetchTokenMetadataResult,
  FetchTokenMetadataArgs,
  { rejectValue: string }
>(
  'token/fetchMetadata',
  async ({ tokenId }, { rejectWithValue }) => {
    try {
      const result = await UtilityService.getTokenMetadata(tokenId);

      if (result.success) {
        return {
          tokenId: typeof tokenId === 'string' ? tokenId : tokenId.toText(),
          metadata: result.data!
        };
      }
      throw new Error(result.error || 'Failed to fetch token metadata');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(message);
    }
  }
);

const initialState: TokenState = {
  metadata: {},
  loading: {},
  error: {},
  lastFetch: {},
};

const tokenSlice = createSlice({
  name: 'token',
  initialState,
  reducers: {
    clearTokenMetadata: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload;
      delete state.metadata[tokenId];
      delete state.loading[tokenId];
      delete state.error[tokenId];
      delete state.lastFetch[tokenId];
    },
    clearAllTokenMetadata: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTokenMetadata.pending, (state, action) => {
        const { tokenId } = action.meta.arg;
        state.loading[tokenId] = true;
        state.error[tokenId] = null;
      })
      .addCase(fetchTokenMetadata.fulfilled, (state, action) => {
        const { tokenId, metadata } = action.payload;
        state.metadata[tokenId] = metadata;
        state.loading[tokenId] = false;
        state.lastFetch[tokenId] = Date.now();
      })
      .addCase(fetchTokenMetadata.rejected, (state, action) => {
        const { tokenId } = action.meta.arg;
        state.loading[tokenId] = false;
        state.error[tokenId] = action.payload;
      });
  },
});

export const { clearTokenMetadata, clearAllTokenMetadata } = tokenSlice.actions;

// Selectors
export const selectTokenMetadata = (state, tokenId) =>
  state.token.metadata[tokenId];
export const selectTokenMetadataLoading = (state, tokenId) =>
  state.token.loading[tokenId] || false;
export const selectTokenMetadataError = (state, tokenId) =>
  state.token.error[tokenId];

// Smart selector with stale time check (5 minutes)
export const selectTokenMetadataWithFreshness = (state, tokenId) => {
  const metadata = state.token.metadata[tokenId];
  const lastFetch = state.token.lastFetch[tokenId];
  const isStale = !lastFetch || (Date.now() - lastFetch > 5 * 60 * 1000);

  return {
    metadata,
    isStale,
    loading: state.token.loading[tokenId] || false,
    error: state.token.error[tokenId],
  };
};

export default tokenSlice.reducer;
