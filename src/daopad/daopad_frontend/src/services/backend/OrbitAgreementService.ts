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
          { limit: [100], offset: [], sort_by: [] }
        );
      } catch (e) {
        console.log('Canisters not available:', e.message);
      }

      // 5. Get voting power distribution
      let votingPowerResult = null;
      try {
        votingPowerResult = await actor.get_all_voting_powers_for_token(
          Principal.fromText(tokenId)
        );
      } catch (e) {
        console.log('Voting power data not available:', e.message);
      }

      // 6. Get treasury management data (NEW)
      let treasuryResult = null;
      try {
        console.log('[OrbitAgreement] Fetching treasury data for station:', stationId);
        treasuryResult = await actor.get_treasury_management_data(
          Principal.fromText(stationId)
        );
        console.log('[OrbitAgreement] Treasury result:', treasuryResult);
      } catch (e) {
        console.error('[OrbitAgreement] Treasury data error:', e);
      }

      // Extract and format data
      const data = {
        security: null,
        policies: null,
        users: [],
        canisters: null,
        votingPowers: null,
        treasury: null,  // NEW
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

      // Process voting power data
      if (votingPowerResult && votingPowerResult.Ok) {
        data.votingPowers = {
          entries: votingPowerResult.Ok.entries.map(entry => ({
            user_principal: entry.user_principal.toString(),
            kong_locker_principal: entry.kong_locker_principal.toString(),
            voting_power: Number(entry.voting_power),
            equity_percentage: entry.equity_percentage
          })),
          total_voting_power: Number(votingPowerResult.Ok.total_voting_power),
          total_holders: votingPowerResult.Ok.total_holders
        };
      }

      // Process treasury data (NEW)
      if (treasuryResult && treasuryResult.Ok) {
        console.log('[OrbitAgreement] Processing treasury data, accounts:', treasuryResult.Ok.accounts.length);
        data.treasury = {
          accounts: treasuryResult.Ok.accounts.map(acc => ({
            account_id: acc.account_id,
            account_name: acc.account_name,
            assets: acc.assets.map(asset => ({
              symbol: asset.symbol,
              decimals: asset.decimals,
              balance: asset.balance,
              balance_formatted: asset.balance_formatted
            })),
            transfer_policy: acc.transfer_policy,
            config_policy: acc.config_policy,
            can_transfer: acc.can_transfer,
            can_edit: acc.can_edit,
            addresses: acc.addresses
          })),
          address_book: treasuryResult.Ok.address_book.map(entry => ({
            id: entry.id,
            name: entry.name,
            address: entry.address,
            blockchain: entry.blockchain,
            purpose: entry.purpose && entry.purpose.length > 0 ? entry.purpose[0] : null
          })),
          backend_privileges_summary: treasuryResult.Ok.backend_privileges_summary
        };
        console.log('[OrbitAgreement] Treasury data set:', data.treasury);
      } else {
        console.log('[OrbitAgreement] No treasury data - treasuryResult:', treasuryResult);
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