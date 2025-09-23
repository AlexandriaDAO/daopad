import { Actor } from '@dfinity/agent';
import { idlFactory } from './orbitStation.did.js';

/**
 * OrbitStationService - A wrapper that exactly mimics how Orbit's station.service.ts works
 * This handles the proper encoding of parameters for list_requests
 */
export class OrbitStationService {
  constructor(agent, stationId) {
    this.agent = agent;
    this.stationId = stationId;
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: stationId,
    });
  }

  /**
   * List requests with proper parameter encoding
   * Matches orbit-reference/apps/wallet/src/services/station.service.ts:466
   */
  async listRequests({
    created_dt,
    expiration_dt,
    limit,
    offset,
    requesterIds,
    statuses,
    types,
    approverIds,
    sortBy,
    onlyApprovable,
  } = {}) {
    // Build pagination - CRITICAL: use plain numbers, not BigInt
    const paginate = {
      limit: limit ? [limit] : [],
      offset: offset ? [offset] : [],  // Fixed: plain number instead of BigInt
    };

    // Handle sorting criteria
    let sortingCriteria = [];
    if (sortBy && sortBy.createdAt) {
      sortingCriteria = [
        { CreatedAt: sortBy.createdAt === 'asc' ? { Asc: null } : { Desc: null } },
      ];
    } else if (sortBy && sortBy.expirationDt) {
      sortingCriteria = [
        { ExpirationDt: sortBy.expirationDt === 'asc' ? { Asc: null } : { Desc: null } },
      ];
    } else if (sortBy && sortBy.lastModified) {
      sortingCriteria = [
        { LastModificationDt: sortBy.lastModified === 'asc' ? { Asc: null } : { Desc: null } },
      ];
    }

    // Call the actor with EXACT parameter structure from Orbit
    const result = await this.actor.list_requests({
      statuses: statuses ? [statuses] : [],
      created_from_dt: created_dt?.fromDt ? [created_dt.fromDt.toISOString()] : [],
      created_to_dt: created_dt?.toDt ? [created_dt.toDt.toISOString()] : [],
      expiration_from_dt: expiration_dt?.fromDt ? [expiration_dt.fromDt.toISOString()] : [],
      expiration_to_dt: expiration_dt?.toDt ? [expiration_dt.toDt.toISOString()] : [],
      operation_types: types ? [types] : [],
      requester_ids: requesterIds ? [requesterIds] : [],
      approver_ids: approverIds ? [approverIds] : [],
      paginate: [paginate],
      sort_by: sortingCriteria,
      only_approvable: !!onlyApprovable,
      with_evaluation_results: false,
      deduplication_keys: [],
      tags: [],
    });

    if (result.Err) {
      throw result.Err;
    }

    return result.Ok;
  }

  /**
   * Create request - for future use
   */
  async createRequest(input) {
    const result = await this.actor.create_request(input);
    if (result.Err) {
      throw result.Err;
    }
    return result.Ok;
  }

  /**
   * Submit request approval
   */
  async submitRequestApproval(input) {
    const result = await this.actor.submit_request_approval(input);
    if (result.Err) {
      throw result.Err;
    }
    return result.Ok;
  }
}