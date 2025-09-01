import { Actor, HttpAgent } from '@dfinity/agent';

// DAOPad Backend Canister ID
const DAOPAD_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';

// IDL Factory for DAOPad Backend - Clean Multi-DAO Interface
const idlFactory = ({ IDL }) => {
  const RegistrationInfo = IDL.Record({
    'request_id': IDL.Text,
    'user_name': IDL.Text,
    'token_canister': IDL.Principal,
    'timestamp': IDL.Nat64,
  });

  const TokenDAOStatus = IDL.Record({
    'token_canister': IDL.Principal,
    'station_canister': IDL.Opt(IDL.Principal),
    'is_registered': IDL.Bool,
  });

  const Result = IDL.Variant({
    'Ok': IDL.Text,
    'Err': IDL.Text,
  });

  const ResultDAOs = IDL.Variant({
    'Ok': IDL.Vec(TokenDAOStatus),
    'Err': IDL.Text,
  });

  const LPBalancesReply = IDL.Record({
    'symbol': IDL.Text,
    'balance': IDL.Float64,
    'lp_token_id': IDL.Nat64,
    'name': IDL.Text,
    'usd_balance': IDL.Float64,
    'chain_0': IDL.Text,
    'symbol_0': IDL.Text,
    'address_0': IDL.Text,
    'amount_0': IDL.Float64,
    'usd_amount_0': IDL.Float64,
    'chain_1': IDL.Text,
    'symbol_1': IDL.Text,
    'address_1': IDL.Text,
    'amount_1': IDL.Float64,
    'usd_amount_1': IDL.Float64,
    'ts': IDL.Nat64,
  });

  const ResultLPPositions = IDL.Variant({
    'Ok': IDL.Vec(LPBalancesReply),
    'Err': IDL.Text,
  });

  return IDL.Service({
    // LP Principal Management
    'set_lp_principal': IDL.Func([IDL.Text], [Result], []),
    'get_my_lp_principal': IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'get_my_lp_positions': IDL.Func([], [ResultLPPositions], []),
    
    // DAO Detection and Registration
    'detect_available_daos': IDL.Func([], [ResultDAOs], []),
    'register_with_token_dao': IDL.Func([IDL.Principal], [Result], []),
    'get_my_dao_registrations': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, RegistrationInfo))], ['query']),
    'check_registration_for_token': IDL.Func([IDL.Principal], [IDL.Opt(RegistrationInfo)], ['query']),
    
    
    // Token-Station Management
    'link_token_to_station': IDL.Func([IDL.Principal, IDL.Principal], [Result], []),
    'get_station_for_token': IDL.Func([IDL.Principal], [IDL.Opt(IDL.Principal)], ['query']),
    'list_token_stations': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Principal))], ['query']),
    'unlink_token_from_station': IDL.Func([IDL.Principal], [Result], []),
    
    // DAO Admin Functions
    'dao_approve_request': IDL.Func([IDL.Principal, IDL.Text, IDL.Opt(IDL.Text)], [Result], []),
    'dao_reject_request': IDL.Func([IDL.Principal, IDL.Text, IDL.Opt(IDL.Text)], [Result], []),
    
    // Admin
    'list_all_registrations': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, RegistrationInfo))], ['query']),
    
    // Health
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

  // LP Principal Management
  
  async setLpPrincipal(lpPrincipal) {
    try {
      const actor = await this.getActor();
      const result = await actor.set_lp_principal(lpPrincipal);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to set LP principal:', error);
      return { success: false, error: error.message };
    }
  }

  async getMyLpPrincipal() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_lp_principal();
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get LP principal:', error);
      return { success: false, error: error.message };
    }
  }

  async getMyLpPositions() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_lp_positions();
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get LP positions:', error);
      return { success: false, error: error.message };
    }
  }

  // DAO Detection and Registration

  async detectAvailableDaos() {
    try {
      const actor = await this.getActor();
      const result = await actor.detect_available_daos();
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to detect available DAOs:', error);
      return { success: false, error: error.message };
    }
  }

  async registerWithTokenDao(tokenCanister) {
    try {
      const actor = await this.getActor();
      const result = await actor.register_with_token_dao(tokenCanister);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to register with token DAO:', error);
      return { success: false, error: error.message };
    }
  }

  async getMyDaoRegistrations() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_dao_registrations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get DAO registrations:', error);
      return { success: false, error: error.message };
    }
  }

  async checkRegistrationForToken(tokenCanister) {
    try {
      const actor = await this.getActor();
      const result = await actor.check_registration_for_token(tokenCanister);
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to check registration for token:', error);
      return { success: false, error: error.message };
    }
  }

  // DAO Admin Functions
  
  async approveRequest(tokenCanister, requestId, reason = null) {
    try {
      const actor = await this.getActor();
      const result = await actor.dao_approve_request(tokenCanister, requestId, reason ? [reason] : []);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      return { success: false, error: error.message };
    }
  }

  async rejectRequest(tokenCanister, requestId, reason = null) {
    try {
      const actor = await this.getActor();
      const result = await actor.dao_reject_request(tokenCanister, requestId, reason ? [reason] : []);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      return { success: false, error: error.message };
    }
  }

  // Token-Station Management

  async linkTokenToStation(tokenCanister, stationCanister) {
    try {
      const actor = await this.getActor();
      const result = await actor.link_token_to_station(tokenCanister, stationCanister);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to link token to station:', error);
      return { success: false, error: error.message };
    }
  }

  async getStationForToken(tokenCanister) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_station_for_token(tokenCanister);
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get station for token:', error);
      return { success: false, error: error.message };
    }
  }

  async listTokenStations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_token_stations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list token stations:', error);
      return { success: false, error: error.message };
    }
  }

  async unlinkTokenFromStation(tokenCanister) {
    try {
      const actor = await this.getActor();
      const result = await actor.unlink_token_from_station(tokenCanister);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to unlink token from station:', error);
      return { success: false, error: error.message };
    }
  }


  // Admin

  async listAllRegistrations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_registrations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list all registrations:', error);
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