import { Actor, HttpAgent } from '@dfinity/agent';

// DAOPad Backend Canister ID
const DAOPAD_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';

// IDL Factory for DAOPad Backend - Clean Kong Locker Integration Interface
const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({
    'Ok': IDL.Text,
    'Err': IDL.Text,
  });

  const TokenInfo = IDL.Record({
    'canister_id': IDL.Text,
    'symbol': IDL.Text,
    'chain': IDL.Text,
  });

  const OrbitStationInfo = IDL.Record({
    'station_id': IDL.Principal,
    'upgrader_id': IDL.Principal,
    'name': IDL.Text,
    'token_canister_id': IDL.Principal,
    'created_at': IDL.Nat64,
  });

  const CreateTokenStationRequest = IDL.Record({
    'name': IDL.Text,
    'token_canister_id': IDL.Principal,
  });

  const OrbitStationResponse = IDL.Record({
    'station_id': IDL.Principal,
    'upgrader_id': IDL.Principal,
    'name': IDL.Text,
  });

  const TokenResult = IDL.Variant({
    'Ok': IDL.Vec(TokenInfo),
    'Err': IDL.Text,
  });

  const OrbitStationResult = IDL.Variant({
    'Ok': OrbitStationResponse,
    'Err': IDL.Text,
  });


  return IDL.Service({
    // Kong Locker Integration
    'register_with_kong_locker': IDL.Func([IDL.Principal], [Result], []),
    'get_my_kong_locker_canister': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'get_my_voting_power_for_token': IDL.Func([IDL.Principal], [IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })], []),
    'unregister_kong_locker': IDL.Func([], [Result], []),
    'list_all_kong_locker_registrations': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Principal))], ['query']),

    // Orbit Station Methods
    'create_token_orbit_station': IDL.Func([CreateTokenStationRequest], [OrbitStationResult], []),
    'get_my_locked_tokens': IDL.Func([], [TokenResult], []),
    'get_orbit_station_for_token': IDL.Func([IDL.Principal], [IDL.Opt(OrbitStationInfo)], ['query']),
    'list_all_orbit_stations': IDL.Func([], [IDL.Vec(OrbitStationInfo)], ['query']),
    'join_orbit_station': IDL.Func([IDL.Principal, IDL.Text], [Result], []),

    // Utility Functions
    'get_backend_principal': IDL.Func([], [IDL.Principal], ['query']),
    'get_kong_locker_factory_principal': IDL.Func([], [IDL.Principal], ['query']),
    'health_check': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const getBackendActor = async (identity) => {
  const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
  const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

  const agent = new HttpAgent({
    identity,
    host,
  });

  if (isLocal) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: DAOPAD_BACKEND_ID,
  });
};

export class DAOPadBackendService {
  constructor(identity) {
    this.identity = identity;
    this.actor = null;
  }

  async getActor() {
    if (!this.actor || this.identity !== this.lastIdentity) {
      this.actor = await getBackendActor(this.identity);
      this.lastIdentity = this.identity;
    }
    return this.actor;
  }

  // Kong Locker Integration
  
  async registerWithKongLocker(kongLockerPrincipal) {
    try {
      const actor = await this.getActor();
      const result = await actor.register_with_kong_locker(kongLockerPrincipal);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to register with Kong Locker:', error);
      return { success: false, error: error.message };
    }
  }

  async getMyKongLockerCanister() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_kong_locker_canister();
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get Kong Locker canister:', error);
      return { success: false, error: error.message };
    }
  }

  async unregisterKongLocker() {
    try {
      const actor = await this.getActor();
      const result = await actor.unregister_kong_locker();
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to unregister Kong Locker:', error);
      return { success: false, error: error.message };
    }
  }

  async listAllKongLockerRegistrations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_kong_locker_registrations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list Kong Locker registrations:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility Functions

  async getBackendPrincipal() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_backend_principal();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get backend principal:', error);
      return { success: false, error: error.message };
    }
  }

  async getKongLockerFactoryPrincipal() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_kong_locker_factory_principal();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get Kong Locker factory principal:', error);
      return { success: false, error: error.message };
    }
  }

  // Orbit Station Methods

  async createTokenOrbitStation(name, tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const request = {
        name: name,
        token_canister_id: tokenCanisterId,
      };
      const result = await actor.create_token_orbit_station(request);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to create token orbit station:', error);
      return { success: false, error: error.message };
    }
  }

  async getMyLockedTokens() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_locked_tokens();
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get locked tokens:', error);
      return { success: false, error: error.message };
    }
  }

  async getOrbitStationForToken(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_orbit_station_for_token(tokenCanisterId);
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get any orbit station for token:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllOrbitStations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_orbit_stations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get all orbit stations:', error);
      return { success: false, error: error.message };
    }
  }

  async getMyVotingPowerForToken(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_voting_power_for_token(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: Number(result.Ok) };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get voting power for token:', error);
      return { success: false, error: error.message };
    }
  }

  async joinOrbitStation(tokenCanisterId, displayName) {
    try {
      const actor = await this.getActor();
      const result = await actor.join_orbit_station(tokenCanisterId, displayName);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to join orbit station:', error);
      return { success: false, error: error.message };
    }
  }

  // Health Check

  async healthCheck() {
    try {
      const actor = await this.getActor();
      const result = await actor.health_check();
      return { success: true, data: result };
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, error: error.message };
    }
  }
}