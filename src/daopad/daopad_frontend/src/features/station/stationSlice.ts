import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createStationService, connectToStation } from '../../services/orbit/stationService';

// Initial state
const initialState = {
  // Connection info
  connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'
  stationId: null,
  systemInfo: null,

  // Current user
  currentUser: null,
  currentUserPrivileges: [],
  currentUserPermissions: {},

  // Station configuration
  capabilities: null,
  configuration: null,

  // UI state
  loading: false,
  error: null,
  lastUpdated: null,

  // Cached data (basic caching, expand as needed)
  users: {
    items: [],
    total: 0,
    loading: false,
    error: null,
    lastFetch: null,
  },
  userGroups: {
    items: [],
    total: 0,
    loading: false,
    error: null,
    lastFetch: null,
  },
  requests: {
    items: [],
    total: 0,
    loading: false,
    error: null,
    lastFetch: null,
  },
  accounts: {
    items: [],
    total: 0,
    loading: false,
    error: null,
    lastFetch: null,
  },
  assets: {
    items: [],
    total: 0,
    loading: false,
    error: null,
    lastFetch: null,
  },
};

// Async thunks
export const connectToStationThunk = createAsyncThunk(
  'station/connect',
  async ({ stationId, identity }, { rejectWithValue }) => {
    try {
      const { service, health } = await connectToStation({ stationId, identity });

      // Get initial data
      const [systemInfo, me, capabilities] = await Promise.all([
        service.getSystemInfo(),
        service.getMe().catch(() => null),
        service.getCapabilities().catch(() => null),
      ]);

      return {
        stationId,
        health,
        systemInfo,
        currentUser: me?.user || null,
        currentUserPrivileges: me?.privileges || [],
        capabilities,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
    }
  }
);

export const fetchUsersThunk = createAsyncThunk(
  'station/fetchUsers',
  async ({ stationId, identity, params = {} }, { rejectWithValue }) => {
    try {
      const service = createStationService({ stationId, identity });
      const result = await service.listUsers(params);
      return result;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
      });
    }
  }
);

export const fetchUserGroupsThunk = createAsyncThunk(
  'station/fetchUserGroups',
  async ({ stationId, identity, params = {} }, { rejectWithValue }) => {
    try {
      const service = createStationService({ stationId, identity });
      const result = await service.listUserGroups(params);
      return result;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
      });
    }
  }
);

export const fetchRequestsThunk = createAsyncThunk(
  'station/fetchRequests',
  async ({ stationId, identity, params = {} }, { rejectWithValue }) => {
    try {
      const service = createStationService({ stationId, identity });
      const result = await service.listRequests(params);
      return result;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
      });
    }
  }
);

export const fetchAccountsThunk = createAsyncThunk(
  'station/fetchAccounts',
  async ({ stationId, identity, params = {} }, { rejectWithValue }) => {
    try {
      const service = createStationService({ stationId, identity });
      const result = await service.listAccounts(params);
      return result;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
      });
    }
  }
);

export const fetchAssetsThunk = createAsyncThunk(
  'station/fetchAssets',
  async ({ stationId, identity, params = {} }, { rejectWithValue }) => {
    try {
      const service = createStationService({ stationId, identity });
      const result = await service.listAssets(params);
      return result;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
      });
    }
  }
);

export const createUserThunk = createAsyncThunk(
  'station/createUser',
  async ({ stationId, identity, userInput }, { rejectWithValue }) => {
    try {
      const service = createStationService({ stationId, identity });
      const result = await service.createUser(userInput);
      return result;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
      });
    }
  }
);

export const editUserThunk = createAsyncThunk(
  'station/editUser',
  async ({ stationId, identity, userId, updates }, { rejectWithValue }) => {
    try {
      const service = createStationService({ stationId, identity });
      const result = await service.editUser(userId, updates);
      return result;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
      });
    }
  }
);

// Slice
const stationSlice = createSlice({
  name: 'station',
  initialState,
  reducers: {
    disconnect: (state) => {
      return { ...initialState };
    },
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearUsersError: (state) => {
      state.users.error = null;
    },
    clearRequestsError: (state) => {
      state.requests.error = null;
    },
    updateUser: (state, action) => {
      const updatedUser = action.payload;
      const index = state.users.items.findIndex((u) => u.id === updatedUser.id);
      if (index !== -1) {
        state.users.items[index] = updatedUser;
      }
    },
    removeUser: (state, action) => {
      const userId = action.payload;
      state.users.items = state.users.items.filter((u) => u.id !== userId);
      state.users.total = Math.max(0, state.users.total - 1);
    },
  },
  extraReducers: (builder) => {
    // Connect to station
    builder
      .addCase(connectToStationThunk.pending, (state) => {
        state.connectionStatus = 'connecting';
        state.loading = true;
        state.error = null;
      })
      .addCase(connectToStationThunk.fulfilled, (state, action) => {
        state.connectionStatus = 'connected';
        state.stationId = action.payload.stationId;
        state.systemInfo = action.payload.systemInfo;
        state.currentUser = action.payload.currentUser;
        state.currentUserPrivileges = action.payload.currentUserPrivileges;
        state.capabilities = action.payload.capabilities;
        state.loading = false;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(connectToStationThunk.rejected, (state, action) => {
        state.connectionStatus = 'error';
        state.loading = false;
        state.error = action.payload || { message: 'Failed to connect to station' };
      });

    // Fetch users
    builder
      .addCase(fetchUsersThunk.pending, (state) => {
        state.users.loading = true;
        state.users.error = null;
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        state.users.items = action.payload.users || [];
        state.users.total = action.payload.total || 0;
        state.users.loading = false;
        state.users.error = null;
        state.users.lastFetch = new Date().toISOString();
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload || { message: 'Failed to fetch users' };
      });

    // Fetch user groups
    builder
      .addCase(fetchUserGroupsThunk.pending, (state) => {
        state.userGroups.loading = true;
        state.userGroups.error = null;
      })
      .addCase(fetchUserGroupsThunk.fulfilled, (state, action) => {
        state.userGroups.items = action.payload.groups || [];
        state.userGroups.total = action.payload.total || 0;
        state.userGroups.loading = false;
        state.userGroups.error = null;
        state.userGroups.lastFetch = new Date().toISOString();
      })
      .addCase(fetchUserGroupsThunk.rejected, (state, action) => {
        state.userGroups.loading = false;
        state.userGroups.error = action.payload || { message: 'Failed to fetch user groups' };
      });

    // Fetch requests
    builder
      .addCase(fetchRequestsThunk.pending, (state) => {
        state.requests.loading = true;
        state.requests.error = null;
      })
      .addCase(fetchRequestsThunk.fulfilled, (state, action) => {
        state.requests.items = action.payload.requests || [];
        state.requests.total = action.payload.total || 0;
        state.requests.loading = false;
        state.requests.error = null;
        state.requests.lastFetch = new Date().toISOString();
      })
      .addCase(fetchRequestsThunk.rejected, (state, action) => {
        state.requests.loading = false;
        state.requests.error = action.payload || { message: 'Failed to fetch requests' };
      });

    // Fetch accounts
    builder
      .addCase(fetchAccountsThunk.pending, (state) => {
        state.accounts.loading = true;
        state.accounts.error = null;
      })
      .addCase(fetchAccountsThunk.fulfilled, (state, action) => {
        state.accounts.items = action.payload.accounts || [];
        state.accounts.total = action.payload.total || 0;
        state.accounts.loading = false;
        state.accounts.error = null;
        state.accounts.lastFetch = new Date().toISOString();
      })
      .addCase(fetchAccountsThunk.rejected, (state, action) => {
        state.accounts.loading = false;
        state.accounts.error = action.payload || { message: 'Failed to fetch accounts' };
      });

    // Fetch assets
    builder
      .addCase(fetchAssetsThunk.pending, (state) => {
        state.assets.loading = true;
        state.assets.error = null;
      })
      .addCase(fetchAssetsThunk.fulfilled, (state, action) => {
        state.assets.items = action.payload.assets || [];
        state.assets.total = action.payload.total || 0;
        state.assets.loading = false;
        state.assets.error = null;
        state.assets.lastFetch = new Date().toISOString();
      })
      .addCase(fetchAssetsThunk.rejected, (state, action) => {
        state.assets.loading = false;
        state.assets.error = action.payload || { message: 'Failed to fetch assets' };
      });

    // Create user
    builder
      .addCase(createUserThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUserThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // Note: The new user will be fetched in the next list refresh
      })
      .addCase(createUserThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to create user' };
      });

    // Edit user
    builder
      .addCase(editUserThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editUserThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // Note: The updated user will be fetched in the next list refresh
      })
      .addCase(editUserThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to edit user' };
      });
  },
});

// Actions
export const {
  disconnect,
  setConnectionStatus,
  clearError,
  clearUsersError,
  clearRequestsError,
  updateUser,
  removeUser,
} = stationSlice.actions;

// Selectors
export const selectStation = (state) => state.station;
export const selectStationConnection = (state) => ({
  status: state.station.connectionStatus,
  stationId: state.station.stationId,
  systemInfo: state.station.systemInfo,
  error: state.station.error,
});
export const selectCurrentUser = (state) => state.station.currentUser;
export const selectCurrentUserPrivileges = (state) => state.station.currentUserPrivileges;
export const selectStationUsers = (state) => state.station.users;
export const selectStationUserGroups = (state) => state.station.userGroups;
export const selectStationRequests = (state) => state.station.requests;
export const selectStationAccounts = (state) => state.station.accounts;
export const selectStationAssets = (state) => state.station.assets;

export default stationSlice.reducer;