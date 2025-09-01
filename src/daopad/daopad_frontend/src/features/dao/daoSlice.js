import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // LP Principal (global for user)
  lpPrincipal: null,
  lpPrincipalLoading: false,
  lpPrincipalError: null,
  
  // Available DAOs from LP positions
  availableDaos: [],
  availableDaosLoading: false,
  availableDaosError: null,
  
  // User's registered DAOs
  registeredDaos: [],
  registeredDaosLoading: false,
  
  // Currently selected DAO
  selectedDao: null,
  
  // Token-Station mappings
  tokenStations: [],
  tokenStationsLoading: false,
};

const daoSlice = createSlice({
  name: 'dao',
  initialState,
  reducers: {
    // LP Principal actions
    setLpPrincipal: (state, action) => {
      state.lpPrincipal = action.payload;
      state.lpPrincipalError = null;
    },
    setLpPrincipalLoading: (state, action) => {
      state.lpPrincipalLoading = action.payload;
    },
    setLpPrincipalError: (state, action) => {
      state.lpPrincipalError = action.payload;
      state.lpPrincipalLoading = false;
    },
    
    // Available DAOs actions
    setAvailableDaos: (state, action) => {
      state.availableDaos = action.payload;
      state.availableDaosError = null;
    },
    setAvailableDaosLoading: (state, action) => {
      state.availableDaosLoading = action.payload;
    },
    setAvailableDaosError: (state, action) => {
      state.availableDaosError = action.payload;
      state.availableDaosLoading = false;
    },
    
    // Registered DAOs actions
    setRegisteredDaos: (state, action) => {
      state.registeredDaos = action.payload;
    },
    setRegisteredDaosLoading: (state, action) => {
      state.registeredDaosLoading = action.payload;
    },
    addRegisteredDao: (state, action) => {
      const dao = action.payload;
      if (!state.registeredDaos.find(d => d[0] === dao[0])) {
        state.registeredDaos.push(dao);
      }
    },
    
    // Selected DAO actions
    setSelectedDao: (state, action) => {
      state.selectedDao = action.payload;
    },
    
    // Token-Station mappings
    setTokenStations: (state, action) => {
      state.tokenStations = action.payload;
    },
    setTokenStationsLoading: (state, action) => {
      state.tokenStationsLoading = action.payload;
    },
    addTokenStation: (state, action) => {
      const { token, station } = action.payload;
      if (!state.tokenStations.find(ts => ts[0] === token)) {
        state.tokenStations.push([token, station]);
      }
    },
    removeTokenStation: (state, action) => {
      const token = action.payload;
      state.tokenStations = state.tokenStations.filter(ts => ts[0] !== token);
    },
    
    // Clear all DAO state (on logout)
    clearDaoState: (state) => {
      return initialState;
    },
  },
});

export const {
  setLpPrincipal,
  setLpPrincipalLoading,
  setLpPrincipalError,
  setAvailableDaos,
  setAvailableDaosLoading,
  setAvailableDaosError,
  setRegisteredDaos,
  setRegisteredDaosLoading,
  addRegisteredDao,
  setSelectedDao,
  setTokenStations,
  setTokenStationsLoading,
  addTokenStation,
  removeTokenStation,
  clearDaoState,
} = daoSlice.actions;

export default daoSlice.reducer;