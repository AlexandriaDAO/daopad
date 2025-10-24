import { BackendServiceBase } from '../base/BackendServiceBase';
import { parseOrbitResult, formatOrbitError } from '../../utils/errorParsers';

export class OrbitRequestsService extends BackendServiceBase {
  /**
   * List requests with filters
   */
  async listRequests(stationId, filters = {}) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const requestInput = {
        statuses: filters.statuses || [],
        deduplication_keys: filters.deduplicationKeys || [],
        tags: filters.tags || [],
        only_approvable: filters.onlyApprovable || false,
        created_from: filters.createdFrom || null,
        created_to: filters.createdTo || null,
        expiration_from: filters.expirationFrom || null,
        expiration_to: filters.expirationTo || null,
        sort_by: filters.sortBy || { CreatedAt: { Desc: null } },
        page: filters.page || 0,
        limit: filters.limit || 20,
      };

      const result = await actor.list_orbit_requests(stationPrincipal, requestInput);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to list requests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get request details
   */
  async getRequest(stationId, requestId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_orbit_request(stationPrincipal, requestId);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to get request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create transfer request
   */
  async createTransfer(stationId, params) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const transferParams = {
        from_account_id: params.fromAccountId,
        to: params.to,
        amount: params.amount,
        metadata: params.metadata || [],
        deduplication_keys: params.deduplicationKeys || [],
        tags: params.tags || [],
      };

      const result = await actor.create_transfer_request(stationPrincipal, transferParams);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to create transfer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve request
   */
  async approve(stationId, requestId, reason = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const approvalInput = {
        request_id: requestId,
        reason: reason ? [reason] : [],
      };

      const result = await actor.approve_orbit_request(stationPrincipal, approvalInput);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to approve request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject request
   */
  async reject(stationId, requestId, reason = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const rejectionInput = {
        request_id: requestId,
        reason: reason || 'Rejected by user',
      };

      const result = await actor.reject_orbit_request(stationPrincipal, rejectionInput);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to reject request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel request (before approval)
   */
  async cancel(stationId, requestId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.cancel_orbit_request(stationPrincipal, requestId);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to cancel request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's pending requests
   */
  async getUserPendingRequests(stationId, userPrincipal) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const principal = this.toPrincipal(userPrincipal);
      const result = await actor.get_user_pending_requests(stationPrincipal, principal);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get user pending requests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch approve multiple requests
   */
  async batchApproveRequests(stationId, requestIds) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const outcomes = [];

      for (const requestId of requestIds) {
        try {
          const response = await actor.submit_request_approval(
            stationPrincipal,
            requestId,
            { Approved: null },
            [],
          );
          if ('Ok' in response) {
            outcomes.push(`✓ ${requestId}: approved`);
          } else {
            outcomes.push(`✗ ${requestId}: ${formatOrbitError(response.Err)}`);
          }
        } catch (err) {
          outcomes.push(`✗ ${requestId}: ${err.message || 'approval failed'}`);
        }
      }

      return { success: true, data: outcomes };
    } catch (error) {
      console.error('Failed to batch approve requests:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getOrbitRequestsService = (identity) => {
  return new OrbitRequestsService(identity);
};

export default OrbitRequestsService;
