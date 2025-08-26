import { Actor, HttpAgent } from '@dfinity/agent';

// DAOPad Backend Canister ID
const DAOPAD_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';

// IDL Factory for DAOPad Backend
const idlFactory = ({ IDL }) => {
  const RegistrationResult = IDL.Variant({
    'Success': IDL.Record({
      'request_id': IDL.Text,
      'message': IDL.Text,
    }),
    'AlreadyRegistered': IDL.Record({
      'request_id': IDL.Text,
      'registered_at': IDL.Nat64,
    }),
    'InsufficientStake': IDL.Record({
      'current': IDL.Nat,
      'required': IDL.Nat,
    }),
    'Error': IDL.Record({
      'message': IDL.Text,
    }),
  });

  const RegistrationStatus = IDL.Record({
    'is_registered': IDL.Bool,
    'request_id': IDL.Opt(IDL.Text),
    'staked_amount': IDL.Nat,
    'required_stake': IDL.Nat,
    'user_name': IDL.Opt(IDL.Text),
  });

  return IDL.Service({
    'register_as_orbit_operator': IDL.Func([], [RegistrationResult], []),
    'check_registration_status': IDL.Func([], [RegistrationStatus], []), // Changed from query to update
    'get_required_stake_amount': IDL.Func([], [IDL.Nat], ['query']),
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

  async registerAsOrbitOperator() {
    try {
      const actor = await this.getActor();
      const result = await actor.register_as_orbit_operator();
      return { success: true, data: result };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  async checkRegistrationStatus() {
    try {
      const actor = await this.getActor();
      const result = await actor.check_registration_status();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to check registration status:', error);
      return { success: false, error: error.message };
    }
  }

  async getRequiredStakeAmount() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_required_stake_amount();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get required stake amount:', error);
      return { success: false, error: error.message };
    }
  }
}