import { BackendServiceBase } from './base/BackendServiceBase';

export class OrbitAgreementService extends BackendServiceBase {
  /**
   * Get complete operating agreement data
   * @param {string|Principal} tokenId - Token canister ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getOperatingAgreementData(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_operating_agreement_data(tokenPrincipal);

      if ('Ok' in result) {
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
      console.error('Failed to get operating agreement data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default OrbitAgreementService;
