import { Principal } from '@dfinity/principal';
import { getBackendActor } from './daopadBackend';

// Helper function to calculate djb2 hash (matching Candid field hashing)
export function candid_hash(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash = hash >>> 0; // Force to unsigned 32-bit
  }
  return hash;
}

// Helper to parse Candid field that might be hashed
function getField(fields, name) {
  if (!fields || !Array.isArray(fields)) return undefined;

  const field = fields.find(f => {
    // Check for named field
    if (f.id?.Named === name) return true;
    // Check for hashed field ID
    if (f.id?.Id === candid_hash(name)) return true;
    return false;
  });

  return field?.val;
}

// Parse external canister from Candid response (handles hash IDs)
function parseCanisterFromCandid(canister) {
  if (!canister) return null;

  // Helper to convert Principal objects to strings
  const principalToString = (value) => {
    if (value && typeof value === 'object' && value._isPrincipal) {
      return value.toText();
    }
    return value;
  };

  // If it's already a proper object, ensure Principal is string
  if (canister.id && canister.canister_id) {
    return {
      ...canister,
      canister_id: principalToString(canister.canister_id)
    };
  }

  // Handle Candid record with potentially hashed fields
  if (canister.Record?.fields) {
    const fields = canister.Record.fields;
    return {
      id: getField(fields, 'id'),
      canister_id: principalToString(getField(fields, 'canister_id')),
      name: getField(fields, 'name'),
      description: getField(fields, 'description'),
      labels: getField(fields, 'labels') || [],
      metadata: getField(fields, 'metadata') || [],
      state: getField(fields, 'state'),
      permissions: getField(fields, 'permissions'),
      request_policies: getField(fields, 'request_policies'),
      created_at: getField(fields, 'created_at'),
      modified_at: getField(fields, 'modified_at'),
      monitoring: getField(fields, 'monitoring'),
    };
  }

  // Fallback to direct properties with Principal conversion
  return {
    ...canister,
    canister_id: principalToString(canister.canister_id)
  };
}

export const canisterService = {
  // List all external canisters
  listCanisters: async (tokenCanisterId, filters = {}) => {
    try {
      const actor = await getBackendActor();

      // Convert pagination numbers to BigInt if present
      let paginateOpt = [];
      if (filters.paginate) {
        paginateOpt = [{
          offset: filters.paginate.offset !== undefined ?
            [BigInt(filters.paginate.offset)] : [],
          limit: filters.paginate.limit !== undefined ?
            [BigInt(filters.paginate.limit)] : []
        }];
      }

      // Build request with proper optional encoding and correct field names
      const request = {
        canister_ids: filters.canister_ids || [],
        labels: filters.labels || [],
        states: filters.states || [],
        paginate: paginateOpt,
        sort_by: filters.sort_by || []
      };

      console.log('Listing canisters with request:', request);

      const result = await actor.list_orbit_canisters(
        Principal.fromText(tokenCanisterId),
        request
      );

      // Handle nested Ok/Err from backend and then from Orbit
      if (result.Ok) {
        const orbitResult = result.Ok;
        if (orbitResult.Ok) {
          // Parse canisters handling potential hash IDs
          const canisters = orbitResult.Ok.canisters.map(parseCanisterFromCandid);
          return {
            success: true,
            data: canisters,
            total: Number(orbitResult.Ok.total), // Convert BigInt to number for UI
            privileges: orbitResult.Ok.privileges
          };
        } else {
          return {
            success: false,
            error: orbitResult.Err?.message || 'Failed to list canisters'
          };
        }
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to list canisters:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get canister details
  getCanisterDetails: async (tokenCanisterId, canisterPrincipal) => {
    try {
      const actor = await getBackendActor();

      // Convert canister principal string to Principal object
      const principalObj = typeof canisterPrincipal === 'string'
        ? Principal.fromText(canisterPrincipal)
        : canisterPrincipal;

      const result = await actor.get_orbit_canister(
        Principal.fromText(tokenCanisterId),
        principalObj // Principal object
      );

      // Handle double-wrapped Result: outer from backend, inner from Orbit Station
      if (result.Ok) {
        const orbitResult = result.Ok;

        if (orbitResult.Ok) {
          return {
            success: true,
            data: parseCanisterFromCandid(orbitResult.Ok.canister),
            privileges: orbitResult.Ok.privileges // Include privileges for permission checks
          };
        } else {
          return {
            success: false,
            error: orbitResult.Err?.message || 'Failed to get canister from Orbit Station'
          };
        }
      } else {
        return {
          success: false,
          error: result.Err || 'Backend error'
        };
      }
    } catch (error) {
      console.error('Failed to get canister details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get canister status from IC management
  getCanisterStatus: async (canisterId) => {
    try {
      const actor = await getBackendActor();

      // Ensure canisterId is a string
      const principalString = typeof canisterId === 'string'
        ? canisterId
        : canisterId.toText();

      const result = await actor.get_canister_status(
        Principal.fromText(principalString)
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to get canister status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Create new canister
  createCanister: async (tokenCanisterId, config) => {
    try {
      const actor = await getBackendActor();

      // Convert optional fields properly (Fix #3)
      const request = {
        kind: config.kind,
        name: config.name,
        description: config.description ? [config.description] : [],
        labels: config.labels || [],
        metadata: config.metadata || [],
        permissions: config.permissions,
        request_policies: config.request_policies
      };

      const result = await actor.create_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        config.title || `Create canister ${config.name}`,
        config.summary ? [config.summary] : []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to create canister:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Import existing canister
  importCanister: async (tokenCanisterId, canisterId, config) => {
    const createConfig = {
      ...config,
      kind: {
        AddExisting: {
          canister_id: Principal.fromText(canisterId)
        }
      }
    };

    return canisterService.createCanister(tokenCanisterId, createConfig);
  },

  // Fund canister with cycles
  fundCanister: async (tokenCanisterId, externalCanisterId, cycles) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId, // UUID
        kind: {
          Send: {
            cycles: BigInt(cycles)
          }
        }
      };

      const result = await actor.fund_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        `Top up canister with ${(Number(cycles) / 1e12).toFixed(2)}T cycles`,
        []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to fund canister:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Configure monitoring for a canister
  monitorCanister: async (tokenCanisterId, externalCanisterId, strategy) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: strategy ? {
          Start: strategy
        } : { Stop: null }
      };

      const result = await actor.monitor_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        strategy ? 'Enable cycles monitoring' : 'Disable cycles monitoring',
        []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to configure monitoring:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Take a snapshot of canister state
  takeSnapshot: async (tokenCanisterId, externalCanisterId, force = false) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        force
      };

      const result = await actor.snapshot_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        'Take canister snapshot',
        []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to take snapshot:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Restore canister from snapshot
  restoreSnapshot: async (tokenCanisterId, externalCanisterId, snapshotId) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        snapshot_id: snapshotId
      };

      const result = await actor.restore_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        'Restore canister from snapshot',
        []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Upgrade canister with new WASM
  upgradeCanister: async (tokenCanisterId, externalCanisterId, wasm, mode = 'upgrade', arg = null) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: {
          Upgrade: {
            mode: { [mode]: null },
            wasm_module: Array.from(wasm),
            arg: arg ? [Array.from(arg)] : []
          }
        }
      };

      const result = await actor.change_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        `Upgrade canister (${mode} mode)`,
        []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to upgrade canister:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Call a canister method
  callCanisterMethod: async (tokenCanisterId, externalCanisterId, method) => {
    try {
      const actor = await getBackendActor();

      const result = await actor.call_orbit_canister_method_request(
        Principal.fromText(tokenCanisterId),
        externalCanisterId,
        {
          method_name: method.method_name,
          arg: method.arg ? [Array.from(method.arg)] : [],
          cycles: method.cycles ? [BigInt(method.cycles)] : [],
          validation_method: method.validation_method ? [{
            method_name: method.validation_method.method_name,
            arg: method.validation_method.arg ? [Array.from(method.validation_method.arg)] : []
          }] : []
        },
        `Call ${method.method_name}`,
        []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to call method:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update canister settings
  updateCanisterSettings: async (tokenCanisterId, externalCanisterId, settings) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: {
          Settings: {
            name: settings.name ? [settings.name] : [],
            description: settings.description ? [settings.description] : [],
            labels: settings.labels ? [settings.labels] : [],
            metadata: settings.metadata ? [settings.metadata] : []
          }
        }
      };

      const result = await actor.change_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        'Update canister settings',
        []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Configure canister permissions
  configurePermissions: async (tokenCanisterId, externalCanisterId, permissions) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: {
          Permissions: permissions
        }
      };

      const result = await actor.configure_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        'Update canister permissions',
        []
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to configure permissions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // List snapshots for a canister (via Orbit Station API)
  listSnapshots: async (tokenCanisterId, canisterPrincipal) => {
    try {
      const actor = await getBackendActor();

      // Call new backend method that proxies to Orbit Station
      const result = await actor.get_canister_snapshots(
        Principal.fromText(tokenCanisterId),
        Principal.fromText(canisterPrincipal)
      );

      // Handle Result<CanisterSnapshotsResult, String> wrapper
      if (result && 'Ok' in result) {
        const orbitResult = result.Ok;

        // Handle inner Ok/Err from Orbit Station
        if (orbitResult && 'Ok' in orbitResult) {
          // Transform snapshot data for frontend
          const snapshots = orbitResult.Ok.map(s => ({
            id: s.snapshot_id,
            taken_at: s.taken_at_timestamp,
            size: Number(s.total_size),
          }));

          return { Ok: snapshots };
        } else {
          return { Err: orbitResult.Err?.message || 'Failed to get snapshots' };
        }
      } else {
        return { Err: result.Err || 'Backend error' };
      }
    } catch (error) {
      console.error('Failed to list snapshots:', error);
      return { Err: error.message };
    }
  },

  // Delete a snapshot
  deleteSnapshot: async (tokenCanisterId, externalCanisterId, snapshotId) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: {
          PruneSnapshots: {
            snapshot_ids: [snapshotId]
          }
        }
      };

      const result = await actor.prune_orbit_canister_snapshots_request(
        Principal.fromText(tokenCanisterId),
        request,
        `Delete snapshot ${snapshotId}`,
        []
      );

      return result;
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      return {
        Err: error.message
      };
    }
  },

  // Update canister metadata
  updateCanisterMetadata: async (tokenCanisterId, externalCanisterId, metadata) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: {
          Settings: {
            name: metadata.name ? [metadata.name] : [],
            description: metadata.description ? [metadata.description] : [],
            labels: metadata.labels ? [metadata.labels] : [],
            state: []  // Keep state unchanged
          }
        }
      };

      const result = await actor.change_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        'Update canister metadata',
        []
      );

      return result;
    } catch (error) {
      console.error('Failed to update metadata:', error);
      return {
        Err: error.message
      };
    }
  },

  // Update native canister settings
  updateCanisterNativeSettings: async (tokenCanisterId, externalCanisterId, settings) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: {
          NativeSettings: settings
        }
      };

      const result = await actor.change_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        'Update native canister settings',
        []
      );

      return result;
    } catch (error) {
      console.error('Failed to update native settings:', error);
      return {
        Err: error.message
      };
    }
  },

  // Archive or unarchive a canister
  archiveCanister: async (tokenCanisterId, externalCanisterId, archive) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: {
          Settings: {
            name: [],
            description: [],
            labels: [],
            state: archive ? [{ Archived: null }] : [{ Active: null }]
          }
        }
      };

      const result = await actor.change_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        archive ? 'Archive canister' : 'Unarchive canister',
        []
      );

      return result;
    } catch (error) {
      console.error('Failed to archive canister:', error);
      return {
        Err: error.message
      };
    }
  },

  // Archive canister (mark as archived, not delete)
  archiveCanister: async (tokenCanisterId, externalCanisterId) => {
    try {
      const actor = await getBackendActor();

      const request = {
        external_canister_id: externalCanisterId,
        kind: {
          UpdateState: {
            state: { Archived: null }
          }
        }
      };

      const result = await actor.change_orbit_canister_request(
        Principal.fromText(tokenCanisterId),
        request,
        'Archive canister',
        []
      );

      return result;
    } catch (error) {
      console.error('Failed to archive canister:', error);
      return {
        Err: error.message
      };
    }
  },

  // Validate method call arguments
  validateMethodCall: async (tokenCanisterId, externalCanisterId, validationMethod, args) => {
    try {
      // For now, return a mock validation result
      // In production, this would call the actual validation method
      return {
        Ok: {
          success: true,
          preview: `Method will be called with args: ${JSON.stringify(args)}`
        }
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        Err: error.message
      };
    }
  },

  // Rollback to a previous version (mock)
  rollbackCanister: async (tokenCanisterId, externalCanisterId, moduleHash) => {
    try {
      // This would restore from a specific module hash
      // For now, return mock success
      return {
        Ok: {
          request_id: 'rollback-' + Date.now()
        }
      };
    } catch (error) {
      console.error('Rollback error:', error);
      return {
        Err: error.message
      };
    }
  }
};

export default canisterService;