import { OrbitSecurityService } from './orbit/security/OrbitSecurityService';
import { BackendServiceBase } from './base/BackendServiceBase';
import { Principal } from '@dfinity/principal';

export class OrbitAgreementService extends BackendServiceBase {
  // Reuse existing services for data fetching
  async getAgreementData(tokenId, stationId) {
    try {
      const actor = await this.getActor();

      // 1. Get security data (admins, score, issues)
      let securityResult = null;
      try {
        securityResult = await actor.perform_security_check(
          Principal.fromText(stationId)
        );
      } catch (e) {
        console.log('Security check not available:', e.message);
      }

      // 2. Get request policies
      let policiesResult = null;
      try {
        policiesResult = await actor.get_request_policies_details(
          Principal.fromText(tokenId)
        );
      } catch (e) {
        console.log('Policies not available:', e.message);
      }

      // 3. Get users and groups
      let usersResult = null;
      try {
        usersResult = await actor.list_orbit_users(
          Principal.fromText(tokenId)
        );
      } catch (e) {
        console.log('Users not available:', e.message);
      }

      // 4. Try to get external canisters (optional)
      let canistersResult = null;
      try {
        canistersResult = await actor.list_orbit_canisters(
          Principal.fromText(tokenId),
          { limit: [100], offset: [] }
        );
      } catch (e) {
        console.log('Canisters not available:', e.message);
      }

      // Extract and format data
      const data = {
        security: null,
        policies: null,
        users: [],
        canisters: null,
        timestamp: Date.now()
      };

      // Process security data
      if (securityResult && securityResult.Ok) {
        data.security = {
          decentralization_score: securityResult.Ok.decentralization_score || 0,
          overall_status: securityResult.Ok.overall_status || 'unknown',
          risk_summary: securityResult.Ok.risk_summary || '',
          critical_issues: securityResult.Ok.critical_issues || [],
          checks: securityResult.Ok.checks || []
        };
      }

      // Process policies data
      if (policiesResult && policiesResult.Ok) {
        data.policies = {
          policies: policiesResult.Ok.policies || [],
          total_count: policiesResult.Ok.total_count || 0,
          auto_approved_count: policiesResult.Ok.auto_approved_count || 0
        };
      }

      // Process users data
      if (usersResult && usersResult.Ok) {
        data.users = usersResult.Ok.map(user => ({
          id: user.id,
          name: user.name,
          groups: user.groups || [],
          identities: user.identities || []
        }));
      }

      // Process canisters data
      if (canistersResult && canistersResult.Ok && canistersResult.Ok.Ok) {
        const canistersData = canistersResult.Ok.Ok;
        data.canisters = {
          canisters: canistersData.canisters || [],
          total: canistersData.total || 0
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Failed to fetch agreement data:', error);
      return {
        success: false,
        error: error.message || 'Failed to load agreement data'
      };
    }
  }
}