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

  /**
   * Perform all 8 security checks in parallel with progressive updates
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Function} progressCallback - Called as each check completes: (progress) => void
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async performComprehensiveSecurityCheck(stationId, progressCallback = null) {
    const categories = [
      { name: 'admin_control', method: 'check_admin_control', priority: 1 },
      { name: 'treasury_control', method: 'check_treasury_control', priority: 1 },
      { name: 'governance_permissions', method: 'check_governance_permissions', priority: 1 },
      { name: 'proposal_policies', method: 'check_proposal_policies', priority: 2 },
      { name: 'external_canisters', method: 'check_external_canisters', priority: 2 },
      { name: 'asset_management', method: 'check_asset_management', priority: 3 },
      { name: 'system_configuration', method: 'check_system_configuration', priority: 3 },
      { name: 'operational_permissions', method: 'check_operational_permissions', priority: 3 },
    ];

    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      // Call all checks in parallel
      const checkPromises = categories.map(async (category) => {
        try {
          const result = await actor[category.method](stationPrincipal);

          // Handle Result<Vec<SecurityCheck>, String>
          if ('Ok' in result) {
            const checks = result.Ok.map(check => ({
              category: check.category,
              name: check.name,
              status: Object.keys(check.status)[0], // Pass/Warn/Fail/Error
              message: check.message,
              severity: check.severity && check.severity.length > 0
                ? Object.keys(check.severity[0])[0]
                : 'None',
              details: check.details && check.details.length > 0
                ? check.details[0]
                : null,
              recommendation: check.recommendation && check.recommendation.length > 0
                ? check.recommendation[0]
                : null,
            }));

            // Notify progress callback
            if (progressCallback) {
              progressCallback({
                category: category.name,
                checks,
                completed: true,
              });
            }

            return { category: category.name, checks, error: null };
          } else {
            const error = result.Err;
            console.error(`Check ${category.name} failed:`, error);

            if (progressCallback) {
              progressCallback({
                category: category.name,
                checks: [],
                completed: true,
                error,
              });
            }

            return { category: category.name, checks: [], error };
          }
        } catch (err) {
          console.error(`Error calling ${category.method}:`, err);

          if (progressCallback) {
            progressCallback({
              category: category.name,
              checks: [],
              completed: true,
              error: err.message,
            });
          }

          return { category: category.name, checks: [], error: err.message };
        }
      });

      // Wait for all checks to complete
      const results = await Promise.all(checkPromises);

      // Aggregate all checks
      const allChecks = results.flatMap(r => r.checks);

      // Calculate risk score client-side
      const dashboard = this.calculateRiskScore(stationPrincipal, allChecks);

      return {
        success: true,
        data: dashboard,
      };
    } catch (error) {
      console.error('Comprehensive security check failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to perform security checks',
      };
    }
  }

  /**
   * Calculate risk score and build dashboard from checks
   * Mirrors backend logic but runs client-side for parallel aggregation
   * @param {Principal} stationId - Station principal
   * @param {Array} checks - All security checks
   * @returns {Object} Enhanced security dashboard
   */
  calculateRiskScore(stationId, checks) {
    const weights = {
      Critical: 30.0,
      High: 20.0,
      Medium: 10.0,
      Low: 5.0,
      None: 0.0,
    };

    let score = 100.0;
    const criticalIssues = [];
    const recommendedActions = [];

    checks.forEach(check => {
      if (check.status === 'Fail') {
        const penalty = weights[check.severity] || 0;
        score -= penalty;

        if (check.severity === 'Critical' || check.severity === 'High') {
          criticalIssues.push(check);
        }

        if (check.recommendation) {
          recommendedActions.push(check.recommendation);
        }
      } else if (check.status === 'Warn') {
        const penalty = (weights[check.severity] || 0) * 0.5;
        score -= penalty;
      }
    });

    score = Math.max(0, Math.min(100, Math.round(score)));

    const overallStatus = score < 30 ? 'critical'
      : score < 60 ? 'high_risk'
      : score < 85 ? 'medium_risk'
      : 'secure';

    const riskSummary = score < 30
      ? `NOT A DAO - ${criticalIssues.length} critical issues prevent community governance`
      : score < 60
      ? `PARTIAL DAO - ${criticalIssues.length} issues allow admin bypass`
      : score < 85
      ? 'MOSTLY DECENTRALIZED - Minor issues remain'
      : 'TRUE DAO - Full community governance';

    return {
      station_id: stationId,
      overall_status: overallStatus,
      decentralization_score: score,
      last_checked: Date.now(),
      checks,
      risk_summary: riskSummary,
      critical_issues: criticalIssues,
      recommended_actions: [...new Set(recommendedActions)], // Deduplicate
    };
  }
}

export const getOrbitSecurityService = (identity) => {
  return new OrbitSecurityService(identity);
};

export default OrbitSecurityService;
