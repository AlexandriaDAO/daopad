/**
 * Domain-driven backend services
 *
 * Each service handles a specific domain of the DAOPad backend:
 * - KongLockerService: Kong Locker integration (registration, voting power)
 * - ProposalService: DAO proposals and voting
 * - OrbitRequestsService: Orbit request management
 * - OrbitAccountsService: Treasury accounts and balances
 * - TokenService: Token and station mappings
 * - UtilityService: Utility methods (health check, backend principal, token metadata)
 * - OrbitSecurityService: Security checks and validation
 * - OrbitCanisterService: Canister lifecycle management
 * - OrbitGovernanceService: Governance configuration and voting thresholds
 */

export { KongLockerService, getKongLockerService } from './kong-locker/KongLockerService';
export { ProposalService, getProposalService } from './proposals/ProposalService';
export { OrbitRequestsService, getOrbitRequestsService } from './orbit/OrbitRequestsService';
export { OrbitAccountsService, getOrbitAccountsService } from './orbit/OrbitAccountsService';
export { TokenService, getTokenService } from './tokens/TokenService';
export { UtilityService, getUtilityService } from './utility/UtilityService';
export { OrbitSecurityService, getOrbitSecurityService } from './orbit/security/OrbitSecurityService';
export { OrbitCanisterService, getOrbitCanisterService } from './orbit/canisters/OrbitCanisterService';
export { OrbitGovernanceService, getOrbitGovernanceService } from './orbit/governance/OrbitGovernanceService';

// Unified service for backward compatibility
export { UnifiedBackendService } from './UnifiedBackendService';

// Re-export base and utilities for custom extensions
export { BackendServiceBase } from './base/BackendServiceBase';
export { parseOrbitResult, formatOrbitError } from './utils/errorParsers';
