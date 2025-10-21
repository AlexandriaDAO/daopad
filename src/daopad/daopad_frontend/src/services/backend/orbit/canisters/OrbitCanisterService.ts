import { BackendServiceBase } from '../../base/BackendServiceBase';
import { formatOrbitError } from '../../../utils/errorParsers';

export class OrbitCanisterService extends BackendServiceBase {
  /**
   * List canisters managed by Orbit Station
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} filters - Optional filters
   */
  async listCanisters(stationId, filters = {}) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.list_orbit_canisters(stationPrincipal, filters);

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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {string|Principal} canisterId - Canister ID
   */
  async getCanister(stationId, canisterId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const canisterPrincipal = this.toPrincipal(canisterId);
      const result = await actor.get_orbit_canister(stationPrincipal, canisterPrincipal);

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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} operationInput - Canister creation parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async createCanisterRequest(stationId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.create_orbit_canister_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} operationInput - Change parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async changeCanisterRequest(stationId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.change_orbit_canister_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} operationInput - Configuration parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async configureCanisterRequest(stationId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.configure_orbit_canister_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} operationInput - Funding parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async fundCanisterRequest(stationId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.fund_orbit_canister_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} operationInput - Monitoring parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async monitorCanisterRequest(stationId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.monitor_orbit_canister_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} operationInput - Snapshot parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async snapshotCanisterRequest(stationId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.snapshot_orbit_canister_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} operationInput - Prune parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async pruneCanisterSnapshotsRequest(stationId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.prune_orbit_canister_snapshots_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} operationInput - Restore parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async restoreCanisterRequest(stationId, operationInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.restore_orbit_canister_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {string|Principal} externalCanisterId - Target canister ID
   * @param {Object} methodInput - Method call parameters
   * @param {string} title - Request title
   * @param {string} summary - Request summary
   */
  async callCanisterMethodRequest(stationId, externalCanisterId, methodInput, title, summary) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const canisterPrincipal = this.toPrincipal(externalCanisterId);
      const result = await actor.call_orbit_canister_method_request(
        stationPrincipal,
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
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {string|Principal} canisterId - Canister ID
   */
  async getCanisterSnapshots(stationId, canisterId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const canisterPrincipal = this.toPrincipal(canisterId);
      const result = await actor.get_canister_snapshots(stationPrincipal, canisterPrincipal);

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
