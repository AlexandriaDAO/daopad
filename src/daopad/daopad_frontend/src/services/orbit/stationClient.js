import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../generated/station';
import { toSerializable } from '../../utils/serialization';

function createAgent(identity) {
  const agent = new HttpAgent({ identity });
  if (process.env.DFX_NETWORK !== 'ic') {
    agent.fetchRootKey?.().catch((err) => console.warn('Unable to fetch root key', err));
  }
  return agent;
}

export function createStationClient({ stationId, identity, host }) {
  const principal = typeof stationId === 'string' ? Principal.fromText(stationId) : stationId;
  const agent = createAgent(identity, host);
  const actor = Actor.createActor(idlFactory, { agent, canisterId: principal });

  const asSerializable = (value) => toSerializable(value);

  return {
    listUsers: async (params = {}) => {
      const toOptionalNat = (value) => (value == null ? [] : [BigInt(value)]);
      const input = {
        groups: params.groups ? [params.groups] : [],
        statuses: params.statuses ? [params.statuses] : [],
        search_term: params.search_term ? [params.search_term] : [],
        paginate: params.paginate
          ? [
              {
                offset: toOptionalNat(params.paginate.offset),
                limit: toOptionalNat(params.paginate.limit),
              },
            ]
          : [],
      };
      const result = await actor.list_users(input);
      if ('Err' in result) {
        throw Object.assign(new Error('list_users failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    getSystemInfo: async () => {
      const result = await actor.get_system_info();
      if ('Err' in result) {
        throw Object.assign(new Error('get_system_info failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    getUser: async (userId) => {
      const input = { user_id: userId };
      const result = await actor.get_user(input);
      if ('Err' in result) {
        throw Object.assign(new Error('get_user failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    getUserGroups: async (params = {}) => {
      const toOptionalNat = (value) => (value == null ? [] : [BigInt(value)]);
      const input = {
        search_term: params.search_term ? [params.search_term] : [],
        paginate: params.paginate
          ? [
              {
                offset: toOptionalNat(params.paginate.offset),
                limit: toOptionalNat(params.paginate.limit),
              },
            ]
          : [],
      };
      const result = await actor.list_user_groups(input);
      if ('Err' in result) {
        throw Object.assign(new Error('list_user_groups failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    listAccounts: async (params = {}) => {
      const toOptionalNat = (value) => (value == null ? [] : [BigInt(value)]);
      const input = {
        search_term: params.search_term ? [params.search_term] : [],
        paginate: params.paginate
          ? [
              {
                offset: toOptionalNat(params.paginate.offset),
                limit: toOptionalNat(params.paginate.limit),
              },
            ]
          : [],
      };
      const result = await actor.list_accounts(input);
      if ('Err' in result) {
        throw Object.assign(new Error('list_accounts failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    listRequests: async (params = {}) => {
      const toOptionalNat = (value) => (value == null ? [] : [BigInt(value)]);
      const input = {
        statuses: params.statuses ? [params.statuses] : [],
        operation_types: params.operation_types ? [params.operation_types] : [],
        approvers: params.approvers ? [params.approvers] : [],
        created_from_dt: params.created_from_dt ? [params.created_from_dt] : [],
        created_to_dt: params.created_to_dt ? [params.created_to_dt] : [],
        paginate: params.paginate
          ? [
              {
                offset: toOptionalNat(params.paginate.offset),
                limit: toOptionalNat(params.paginate.limit),
              },
            ]
          : [],
        sort_by: params.sort_by ? [params.sort_by] : [],
      };
      const result = await actor.list_requests(input);
      if ('Err' in result) {
        throw Object.assign(new Error('list_requests failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    getRequest: async (requestId) => {
      const input = {
        request_id: requestId,
        with_full_info: [true]
      };
      const result = await actor.get_request(input);
      if ('Err' in result) {
        throw Object.assign(new Error('get_request failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    createRequest: async (request) => {
      // This will be used for creating users, transfers, etc.
      const result = await actor.create_request(request);
      if ('Err' in result) {
        throw Object.assign(new Error('create_request failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    listAssets: async (params = {}) => {
      const toOptionalNat = (value) => (value == null ? [] : [BigInt(value)]);
      const input = {
        search_term: params.search_term ? [params.search_term] : [],
        paginate: params.paginate
          ? [
              {
                offset: toOptionalNat(params.paginate.offset),
                limit: toOptionalNat(params.paginate.limit),
              },
            ]
          : [],
      };
      const result = await actor.list_assets(input);
      if ('Err' in result) {
        throw Object.assign(new Error('list_assets failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    listAddressBookEntries: async (params = {}) => {
      const toOptionalNat = (value) => (value == null ? [] : [BigInt(value)]);
      const input = {
        addresses: params.addresses ? [params.addresses] : [],
        address_chain: params.address_chain ? [params.address_chain] : [],
        labels: params.labels ? [params.labels] : [],
        paginate: params.paginate
          ? [
              {
                offset: toOptionalNat(params.paginate.offset),
                limit: toOptionalNat(params.paginate.limit),
              },
            ]
          : [],
      };
      const result = await actor.list_address_book_entries(input);
      if ('Err' in result) {
        throw Object.assign(new Error('list_address_book_entries failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    getCapabilities: async () => {
      const result = await actor.capabilities();
      if ('Err' in result) {
        throw Object.assign(new Error('capabilities failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    getMe: async () => {
      const result = await actor.me();
      if ('Err' in result) {
        throw Object.assign(new Error('me failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    listPermissions: async (resource) => {
      const input = { resource };
      const result = await actor.list_permissions(input);
      if ('Err' in result) {
        throw Object.assign(new Error('list_permissions failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },

    listRequestPolicies: async (params = {}) => {
      const toOptionalNat = (value) => (value == null ? [] : [BigInt(value)]);
      const input = {
        paginate: params.paginate
          ? [
              {
                offset: toOptionalNat(params.paginate.offset),
                limit: toOptionalNat(params.paginate.limit),
              },
            ]
          : [],
      };
      const result = await actor.list_request_policies(input);
      if ('Err' in result) {
        throw Object.assign(new Error('list_request_policies failed'), { detail: result.Err });
      }
      return asSerializable(result.Ok);
    },
  };
}
