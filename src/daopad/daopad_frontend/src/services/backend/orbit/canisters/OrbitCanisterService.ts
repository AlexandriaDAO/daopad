import { BackendServiceBase } from '../../base/BackendServiceBase';
import { formatOrbitError } from '../../../utils/errorParsers';

export class OrbitCanisterService extends BackendServiceBase {
  /**
   * List canisters managed by Orbit Station
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} filters - Optional filters
   */
  async listCanisters(tokenId, filters = {}) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.list_orbit_canisters(tokenPrincipal, filters);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to list canisters:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get specific canister details
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {string|Principal} canisterId - Canister ID
   */
  async getCanister(tokenId, canisterId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const canisterPrincipal = this.toPrincipal(canisterId);
      const result = await actor.get_orbit_canister(tokenPrincipal, canisterPrincipal);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to get canister:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to create a new canister
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} operationInput - Canister creation parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async createCanisterRequest(tokenId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.create_orbit_canister_request(
        tokenPrincipal,
        operationInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create canister request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to change canister controllers
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} operationInput - Change parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async changeCanisterRequest(tokenId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.change_orbit_canister_request(
        tokenPrincipal,
        operationInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create change canister request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to configure canister settings
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} operationInput - Configuration parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async configureCanisterRequest(tokenId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.configure_orbit_canister_request(
        tokenPrincipal,
        operationInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create configure canister request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to fund a canister
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} operationInput - Funding parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async fundCanisterRequest(tokenId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.fund_orbit_canister_request(
        tokenPrincipal,
        operationInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create fund canister request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to monitor a canister
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} operationInput - Monitoring parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async monitorCanisterRequest(tokenId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.monitor_orbit_canister_request(
        tokenPrincipal,
        operationInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create monitor canister request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to snapshot a canister
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} operationInput - Snapshot parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async snapshotCanisterRequest(tokenId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.snapshot_orbit_canister_request(
        tokenPrincipal,
        operationInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create snapshot canister request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to prune canister snapshots
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} operationInput - Prune parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async pruneCanisterSnapshotsRequest(tokenId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.prune_orbit_canister_snapshots_request(
        tokenPrincipal,
        operationInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create prune snapshots request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to restore canister from snapshot
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {Object} operationInput - Restore parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async restoreCanisterRequest(tokenId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.restore_orbit_canister_request(
        tokenPrincipal,
        operationInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create restore canister request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to call a canister method
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {string|Principal} externalCanisterId - Target canister ID
   * @param {Object} methodInput - Method call parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async callCanisterMethodRequest(tokenId, externalCanisterId, methodInput, title, summary) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const canisterPrincipal = this.toPrincipal(externalCanisterId);
      const result = await actor.call_orbit_canister_method_request(
        tokenPrincipal,
        canisterPrincipal,
        methodInput,
        title,
        summary
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to create call canister method request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get canister snapshots
   * @param {string|Principal} tokenId - Token canister ID (backend looks up station)
   * @param {string|Principal} canisterId - Canister ID
   */
  async getCanisterSnapshots(tokenId, canisterId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const canisterPrincipal = this.toPrincipal(canisterId);
      const result = await actor.get_canister_snapshots(tokenPrincipal, canisterPrincipal);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Failed to get canister snapshots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get canister status (cycles, memory, etc.)
   * @param {string|Principal} canisterId - Canister ID
   */
  async getCanisterStatus(canisterId) {
    try {
      const actor = await this.getActor();
      const canisterPrincipal = this.toPrincipal(canisterId);
      const result = await actor.get_canister_status(canisterPrincipal);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get canister status:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getOrbitCanisterService = (identity) => {
  return new OrbitCanisterService(identity);
};

export default OrbitCanisterService;
