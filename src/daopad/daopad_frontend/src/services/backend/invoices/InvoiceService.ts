import { Actor, HttpAgent, type Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory, canisterId } from '../../../declarations/daopad_invoices';
import type { ServiceResponse } from '../../../types';

const DEFAULT_INVOICES_ID = 'heuuj-6aaaa-aaaag-qc6na-cai'; // Update with actual canister ID
const INVOICES_CANISTER_ID = canisterId ?? DEFAULT_INVOICES_ID;

export class InvoiceService {
  protected identity: Identity | null;
  protected actor: any | null;
  protected lastIdentity: Identity | null;

  constructor(identity: Identity | null = null) {
    this.identity = identity;
    this.actor = null;
    this.lastIdentity = null;
  }

  async getActor(): Promise<any> {
    // Cache actor but recreate if identity changed
    if (!this.actor || this.identity !== this.lastIdentity) {
      // Better local environment detection
      const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local' || 
                      window.location.hostname.includes('localhost') ||
                      window.location.hostname.includes('127.0.0.1');
      const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

      console.log('[InvoiceService] Environment debug:');
      console.log('  VITE_DFX_NETWORK:', import.meta.env.VITE_DFX_NETWORK);
      console.log('  isLocal:', isLocal);
      console.log('  host:', host);
      console.log('  canisterId from declarations:', canisterId);
      console.log('  INVOICES_CANISTER_ID being used:', INVOICES_CANISTER_ID);
      console.log('  window.location.hostname:', window.location.hostname);

      const agent = new HttpAgent({
        identity: this.identity,
        host,
      });

      if (isLocal) {
        await agent.fetchRootKey();
      }

      this.actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: INVOICES_CANISTER_ID,
      });

      this.lastIdentity = this.identity;
    }

    return this.actor;
  }

  /**
   * Wrap backend Result<T, String> responses
   */
  wrapResult<T>(result: { Ok?: T; Err?: string }): ServiceResponse<T> {
    if ('Ok' in result && result.Ok !== undefined) {
      return { success: true, data: result.Ok };
    } else if ('Err' in result) {
      return { success: false, error: result.Err };
    }
    return { success: false, error: 'Invalid response format' };
  }

  /**
   * Wrap backend Option<T> responses
   */
  wrapOption<T>(result: [] | [T]): ServiceResponse<T | null> {
    if (Array.isArray(result) && result.length > 0) {
      return { success: true, data: result[0] };
    } else if (Array.isArray(result)) {
      return { success: true, data: null };
    }
    return { success: false, error: 'Invalid option format' };
  }

  /**
   * Convert to Principal with proper error handling
   */
  toPrincipal(value: string | Principal | null | undefined): Principal {
    if (!value) {
      throw new Error('Principal value required');
    }

    if (value instanceof Principal) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        return Principal.fromText(value);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid principal string: ${value} (${message})`);
      }
    }

    throw new Error(`Cannot convert to Principal: unsupported type ${typeof value}`);
  }

  /**
   * Create a new invoice with Orbit treasury account
   */
  async createInvoice(
    amountInCents: number,
    collateral: string,
    description: string | null,
    orbitStationId: string | Principal,
    orbitAccountId: string,
    orbitAccountAddress: string
  ): Promise<ServiceResponse<string>> {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(orbitStationId);
      const result = await actor.create_invoice(
        BigInt(amountInCents),
        collateral,
        description ? [description] : [], // Optional parameter as array
        stationPrincipal,
        orbitAccountId,
        orbitAccountAddress
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create invoice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get my invoices
   */
  async getMyInvoices(): Promise<ServiceResponse<any[]>> {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_invoices();
      console.log('result', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get my invoices:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get invoices for a specific principal
   */
  async getInvoicesForPrincipal(principal: string | Principal): Promise<ServiceResponse<any[]>> {
    try {
      const actor = await this.getActor();
      const principalId = this.toPrincipal(principal);
      const result = await actor.get_invoices_for_principal_query(principalId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get invoices for principal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get invoice by payment ID
   */
  async getInvoiceByPaymentId(paymentId: string): Promise<ServiceResponse<{ principal: Principal; invoice: any } | null>> {
    try {
      const actor = await this.getActor();
      const result = await actor.get_invoice_by_payment_id(paymentId);
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get invoice by payment ID:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all invoices (admin function)
   */
  async listAllInvoices(): Promise<ServiceResponse<Array<{ principal: Principal; invoices: any[] }>>> {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_invoices();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list all invoices:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ICP balance for a principal
   */
  async getIcpBalance(principal: string | Principal): Promise<ServiceResponse<bigint>> {
    try {
      const actor = await this.getActor();
      const principalId = this.toPrincipal(principal);
      const result = await actor.get_icp_balance(principalId);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get ICP balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ckUSDT balance for a principal
   */
  async getCkUsdtBalance(principal: string | Principal): Promise<ServiceResponse<bigint>> {
    try {
      const actor = await this.getActor();
      const principalId = this.toPrincipal(principal);
      const result = await actor.get_ckusdt_balance(principalId);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get ckUSDT balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get canister ICP balance
   */
  async getCanisterIcpBalance(): Promise<ServiceResponse<bigint>> {
    try {
      const actor = await this.getActor();
      const result = await actor.get_canister_icp_balance();
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get canister ICP balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get canister ckUSDT balance
   */
  async getCanisterCkUsdtBalance(): Promise<ServiceResponse<bigint>> {
    try {
      const actor = await this.getActor();
      const result = await actor.get_canister_ckusdt_balance();
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get canister ckUSDT balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check
   */
  async health(): Promise<ServiceResponse<string>> {
    try {
      const actor = await this.getActor();
      const result = await actor.health();
      return { success: true, data: result };
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getInvoiceService = (identity: Identity | null) => {
  return new InvoiceService(identity);
};

export default InvoiceService;