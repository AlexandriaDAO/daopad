/**
 * Unified Service Entry Point
 *
 * Single import location for all DAOPad services.
 * Consolidates domain-driven backend services and utilities.
 */

// Re-export all domain services
export * from './backend';

// Re-export auth service
export { auth } from './auth';

// Individual service exports for convenience
export {
  getKongLockerService,
  getProposalService,
  getOrbitRequestsService,
  getOrbitAccountsService,
  getOrbitAddressBookService,
  getTokenService,
  getUtilityService,
  getOrbitSecurityService,
  getOrbitCanisterService,
  getOrbitGovernanceService,
  getOrbitUserService,
  getOrbitAgreementService,
} from './backend';
