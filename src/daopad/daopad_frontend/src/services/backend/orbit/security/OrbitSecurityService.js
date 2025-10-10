import { BackendServiceBase } from '../../base/BackendServiceBase';

export class OrbitSecurityService extends BackendServiceBase {
  /**
   * Perform comprehensive security check (all checks combined)
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async performSecurityCheck(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.perform_security_check(stationPrincipal);

      if ('Ok' in result) {
        const dashboard = result.Ok;
        return {
          success: true,
          data: {
            station_id: dashboard.station_id,
            overall_status: dashboard.overall_status,
            last_checked: dashboard.last_checked,
            checks: dashboard.checks.map(check => ({
              category: check.category,
              name: check.name,
              status: Object.keys(check.status)[0], // Extract variant key
              message: check.message,
              severity: check.severity[0] ? Object.keys(check.severity[0])[0] : null,
              details: check.details[0] || null,
              recommendation: check.recommendation[0] || null
            }))
          }
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Security check error:', error);
      return {
        success: false,
        error: 'Failed to perform security check'
      };
    }
  }

  /**
   * Check admin control security
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async checkAdminControl(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_admin_control(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check admin control:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check treasury control security
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async checkTreasuryControl(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_treasury_control(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check treasury control:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check governance permissions security
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async checkGovernancePermissions(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_governance_permissions(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check governance permissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check proposal policies security
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async checkProposalPolicies(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_proposal_policies(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check proposal policies:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check external canisters security
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async checkExternalCanisters(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_external_canisters(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check external canisters:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check asset management security
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async checkAssetManagement(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_asset_management(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check asset management:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check system configuration security
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async checkSystemConfiguration(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_system_configuration(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check system configuration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check operational permissions security
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async checkOperationalPermissions(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_operational_permissions(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check operational permissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check backend status (is backend a member of the station)
   * @param {string|Principal} stationId - Orbit Station ID (can be token ID)
   */
  async checkBackendStatus(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_backend_status(stationPrincipal);

      if ('Ok' in result) {
        return {
          success: true,
          data: {
            is_member: result.Ok.is_member,
            backend_principal: result.Ok.backend_principal.toText(),
            station_id: result.Ok.station_id.toText(),
            instructions: result.Ok.instructions?.[0] || null,
            error: result.Ok.error?.[0] || null
          }
        };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to check backend status:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getOrbitSecurityService = (identity) => {
  return new OrbitSecurityService(identity);
};

export default OrbitSecurityService;
