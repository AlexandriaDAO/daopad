/**
 * Unified Backend Service - Compatibility Layer
 *
 * This class provides a unified interface that matches the old DAOPadBackendService API
 * while using the new domain-driven services internally. This allows existing components
 * to work without changes while we gradually migrate to the new architecture.
 *
 * Usage:
 *   const service = new UnifiedBackendService(identity);
 *   const result = await service.registerWithKongLocker(principal);
 */

import { KongLockerService } from './kong-locker/KongLockerService';
import { ProposalService } from './proposals/ProposalService';
import { OrbitRequestsService } from './orbit/OrbitRequestsService';
import { OrbitMembersService } from './orbit/OrbitMembersService';
import { OrbitAccountsService } from './orbit/OrbitAccountsService';
import { TokenService } from './tokens/TokenService';

export class UnifiedBackendService {
  constructor(identity) {
    this.identity = identity;

    // Initialize all domain services
    this.kongLocker = new KongLockerService(identity);
    this.proposals = new ProposalService(identity);
    this.orbitRequests = new OrbitRequestsService(identity);
    this.orbitMembers = new OrbitMembersService(identity);
    this.orbitAccounts = new OrbitAccountsService(identity);
    this.tokens = new TokenService(identity);
  }

  // ============================================================================
  // KONG LOCKER METHODS
  // ============================================================================

  async registerWithKongLocker(kongLockerPrincipal) {
    return this.kongLocker.register(kongLockerPrincipal);
  }

  async getMyKongLockerCanister() {
    return this.kongLocker.getMyCanister();
  }

  async unregisterKongLocker() {
    return this.kongLocker.unregister();
  }

  async listAllKongLockerRegistrations() {
    return this.kongLocker.listAllRegistrations();
  }

  async getMyVotingPowerForToken(tokenId) {
    return this.kongLocker.getVotingPower(tokenId);
  }

  async getMyKongLockerPositions() {
    return this.kongLocker.getPositions();
  }

  // ============================================================================
  // PROPOSAL METHODS
  // ============================================================================

  async createDaoTransitionProposal(tokenId, stationId, options) {
    return this.proposals.createProposal(tokenId, stationId, options);
  }

  async voteOnProposal(proposalId, vote) {
    return this.proposals.vote(proposalId, vote);
  }

  async getProposal(proposalId) {
    return this.proposals.getProposal(proposalId);
  }

  async listActiveProposals() {
    return this.proposals.listActive();
  }

  async getActiveProposalForToken(tokenId) {
    return this.proposals.getActiveForToken(tokenId);
  }

  async executeProposal(proposalId) {
    return this.proposals.execute(proposalId);
  }

  async getProposalVotes(proposalId) {
    return this.proposals.getVotes(proposalId);
  }

  // ============================================================================
  // ORBIT REQUESTS METHODS
  // ============================================================================

  async listOrbitRequests(stationId, filters) {
    return this.orbitRequests.listRequests(stationId, filters);
  }

  async getOrbitRequest(stationId, requestId) {
    return this.orbitRequests.getRequest(stationId, requestId);
  }

  async createTransferRequest(stationId, params) {
    return this.orbitRequests.createTransfer(stationId, params);
  }

  async approveOrbitRequest(stationId, requestId, reason) {
    return this.orbitRequests.approve(stationId, requestId, reason);
  }

  async rejectOrbitRequest(stationId, requestId, reason) {
    return this.orbitRequests.reject(stationId, requestId, reason);
  }

  async cancelOrbitRequest(stationId, requestId) {
    return this.orbitRequests.cancel(stationId, requestId);
  }

  // ============================================================================
  // ORBIT MEMBERS METHODS
  // ============================================================================

  async listOrbitUsers(stationId) {
    return this.orbitMembers.listUsers(stationId);
  }

  async addUserToOrbit(stationId, userPrincipal, name, groups, status) {
    return this.orbitMembers.addUser(stationId, userPrincipal, name, groups, status);
  }

  async removeUserFromOrbit(stationId, userId) {
    return this.orbitMembers.removeUser(stationId, userId);
  }

  async joinOrbitStation(stationId, name) {
    return this.orbitMembers.joinStation(stationId, name);
  }

  async listUserGroups(stationId, pagination) {
    return this.orbitMembers.listUserGroups(stationId, pagination);
  }

  async getUserGroup(stationId, groupId) {
    return this.orbitMembers.getUserGroup(stationId, groupId);
  }

  async getUserPermissions(stationId, userId) {
    return this.orbitMembers.getUserPermissions(stationId, userId);
  }

  async verifyPermissions(stationId) {
    return this.orbitMembers.verifyPermissions(stationId);
  }

  async listAllAdmins(stationId) {
    return this.orbitMembers.listAllAdmins(stationId);
  }

  async removeAdminRole(stationId, userId) {
    return this.orbitMembers.removeAdminRole(stationId, userId);
  }

  async downgradeToOperator(stationId, userId) {
    return this.orbitMembers.downgradeToOperator(stationId, userId);
  }

  async getAdminCount(stationId) {
    return this.orbitMembers.getAdminCount(stationId);
  }

  async syncVotingPowerPermissions(stationId) {
    return this.orbitMembers.syncVotingPowerPermissions(stationId);
  }

  async getUserVotingTier(stationId, userPrincipal) {
    return this.orbitMembers.getUserVotingTier(stationId, userPrincipal);
  }

  // ============================================================================
  // ORBIT ACCOUNTS METHODS
  // ============================================================================

  async listOrbitAccounts(stationId, searchTerm, offset, limit) {
    return this.orbitAccounts.listAccounts(stationId, searchTerm, offset, limit);
  }

  async createTreasuryAccount(stationId, config) {
    return this.orbitAccounts.createAccount(stationId, config);
  }

  async createOrbitTreasuryAccount(stationId, name, description) {
    return this.orbitAccounts.createSimpleAccount(stationId, name, description);
  }

  async fetchOrbitAccountBalances(stationId, accountIds) {
    return this.orbitAccounts.fetchBalances(stationId, accountIds);
  }

  async validateAccountName(stationId, name) {
    return this.orbitAccounts.validateAccountName(stationId, name);
  }

  async getAvailableAssets(stationId) {
    return this.orbitAccounts.getAvailableAssets(stationId);
  }

  async getTransferRequests(stationId) {
    return this.orbitAccounts.getTransferRequests(stationId);
  }

  async approveTransferRequest(requestId, stationId) {
    return this.orbitAccounts.approveTransfer(requestId, stationId);
  }

  // ============================================================================
  // TOKEN METHODS
  // ============================================================================

  async getOrbitStationForToken(tokenId) {
    return this.tokens.getStationForToken(tokenId);
  }

  async listAllOrbitStations() {
    return this.tokens.listAllStations();
  }

  async getMyLockedTokens() {
    return this.tokens.getMyLockedTokens();
  }

  async proposeOrbitStationLink(tokenId, stationId) {
    return this.tokens.proposeStationLink(tokenId, stationId);
  }

  async getKongLockerFactoryPrincipal() {
    return this.tokens.getKongLockerFactory();
  }
}

// Export for backward compatibility
export default UnifiedBackendService;
