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
import { OrbitAccountsService } from './orbit/OrbitAccountsService';
import { TokenService } from './tokens/TokenService';
import { UtilityService } from './utility/UtilityService';
import { OrbitSecurityService } from './orbit/security/OrbitSecurityService';
import { OrbitCanisterService } from './orbit/canisters/OrbitCanisterService';
import { OrbitGovernanceService } from './orbit/governance/OrbitGovernanceService';

export class UnifiedBackendService {
  constructor(identity) {
    this.identity = identity;

    // Initialize all domain services
    this.kongLocker = new KongLockerService(identity);
    this.proposals = new ProposalService(identity);
    this.orbitRequests = new OrbitRequestsService(identity);
    this.orbitAccounts = new OrbitAccountsService(identity);
    this.tokens = new TokenService(identity);
    this.utility = new UtilityService(identity);
    this.orbitSecurity = new OrbitSecurityService(identity);
    this.orbitCanisters = new OrbitCanisterService(identity);
    this.orbitGovernance = new OrbitGovernanceService(identity);
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

  async cleanupExpiredProposals() {
    return this.proposals.cleanupExpiredProposals();
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

  async getUserPendingRequests(stationId, userPrincipal) {
    return this.orbitRequests.getUserPendingRequests(stationId, userPrincipal);
  }

  async batchApproveRequests(stationId, requestIds) {
    return this.orbitRequests.batchApproveRequests(stationId, requestIds);
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

  async getPredefinedGroups() {
    return this.orbitMembers.getPredefinedGroups();
  }

  async verifySoleAdmin(stationId) {
    return this.orbitMembers.verifySoleAdmin(stationId);
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

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getBackendPrincipal() {
    return this.utility.getBackendPrincipal();
  }

  async healthCheck() {
    return this.utility.healthCheck();
  }

  async testBackendIntegration(payload = {}) {
    return this.utility.testBackendIntegration(payload);
  }

  static async getTokenMetadata(tokenCanisterId) {
    return UtilityService.getTokenMetadata(tokenCanisterId);
  }

  // ============================================================================
  // ORBIT PERMISSIONS METHODS
  // ============================================================================

  async listPermissions(stationId, resources = null) {
    return this.orbitPermissions.listPermissions(stationId, resources);
  }

  async getPermission(stationId, resource) {
    return this.orbitPermissions.getPermission(stationId, resource);
  }

  async requestPermissionChange(stationId, resource, authScope, users, userGroups) {
    return this.orbitPermissions.requestPermissionChange(stationId, resource, authScope, users, userGroups);
  }

  async checkUserPermission(stationId, userId, resource) {
    return this.orbitPermissions.checkUserPermission(stationId, userId, resource);
  }

  // ============================================================================
  // ORBIT SECURITY METHODS
  // ============================================================================

  async performSecurityCheck(stationId) {
    return this.orbitSecurity.performSecurityCheck(stationId);
  }

  async checkAdminControl(stationId) {
    return this.orbitSecurity.checkAdminControl(stationId);
  }

  async checkTreasuryControl(stationId) {
    return this.orbitSecurity.checkTreasuryControl(stationId);
  }

  async checkGovernancePermissions(stationId) {
    return this.orbitSecurity.checkGovernancePermissions(stationId);
  }

  async checkProposalPolicies(stationId) {
    return this.orbitSecurity.checkProposalPolicies(stationId);
  }

  async checkExternalCanisters(stationId) {
    return this.orbitSecurity.checkExternalCanisters(stationId);
  }

  async checkAssetManagement(stationId) {
    return this.orbitSecurity.checkAssetManagement(stationId);
  }

  async checkSystemConfiguration(stationId) {
    return this.orbitSecurity.checkSystemConfiguration(stationId);
  }

  async checkOperationalPermissions(stationId) {
    return this.orbitSecurity.checkOperationalPermissions(stationId);
  }

  async checkBackendStatus(stationId) {
    return this.orbitSecurity.checkBackendStatus(stationId);
  }

  // ============================================================================
  // ORBIT CANISTER METHODS
  // ============================================================================

  async listOrbitCanisters(stationId, filters = {}) {
    return this.orbitCanisters.listCanisters(stationId, filters);
  }

  async getOrbitCanister(stationId, canisterId) {
    return this.orbitCanisters.getCanister(stationId, canisterId);
  }

  async createOrbitCanisterRequest(stationId, operationInput, title, summary) {
    return this.orbitCanisters.createCanisterRequest(stationId, operationInput, title, summary);
  }

  async changeOrbitCanisterRequest(stationId, operationInput, title, summary) {
    return this.orbitCanisters.changeCanisterRequest(stationId, operationInput, title, summary);
  }

  async configureOrbitCanisterRequest(stationId, operationInput, title, summary) {
    return this.orbitCanisters.configureCanisterRequest(stationId, operationInput, title, summary);
  }

  async fundOrbitCanisterRequest(stationId, operationInput, title, summary) {
    return this.orbitCanisters.fundCanisterRequest(stationId, operationInput, title, summary);
  }

  async monitorOrbitCanisterRequest(stationId, operationInput, title, summary) {
    return this.orbitCanisters.monitorCanisterRequest(stationId, operationInput, title, summary);
  }

  async snapshotOrbitCanisterRequest(stationId, operationInput, title, summary) {
    return this.orbitCanisters.snapshotCanisterRequest(stationId, operationInput, title, summary);
  }

  async pruneOrbitCanisterSnapshotsRequest(stationId, operationInput, title, summary) {
    return this.orbitCanisters.pruneCanisterSnapshotsRequest(stationId, operationInput, title, summary);
  }

  async restoreOrbitCanisterRequest(stationId, operationInput, title, summary) {
    return this.orbitCanisters.restoreCanisterRequest(stationId, operationInput, title, summary);
  }

  async callOrbitCanisterMethodRequest(stationId, externalCanisterId, methodInput, title, summary) {
    return this.orbitCanisters.callCanisterMethodRequest(stationId, externalCanisterId, methodInput, title, summary);
  }

  async getCanisterSnapshots(stationId, canisterId) {
    return this.orbitCanisters.getCanisterSnapshots(stationId, canisterId);
  }

  async getCanisterStatus(canisterId) {
    return this.orbitCanisters.getCanisterStatus(canisterId);
  }

  // ============================================================================
  // ORBIT GOVERNANCE METHODS
  // ============================================================================

  async getOrbitSystemInfo(stationId) {
    return this.orbitGovernance.getSystemInfo(stationId);
  }

  async getGovernanceStats(tokenId) {
    return this.orbitGovernance.getGovernanceStats(tokenId);
  }

  async getProposalConfig(tokenId, proposalType) {
    return this.orbitGovernance.getProposalConfig(tokenId, proposalType);
  }

  async getVotingThresholds(tokenId) {
    return this.orbitGovernance.getVotingThresholds(tokenId);
  }

  async getDefaultVotingThresholds() {
    return this.orbitGovernance.getDefaultVotingThresholds();
  }

  async setVotingThresholds(tokenId, thresholds) {
    return this.orbitGovernance.setVotingThresholds(tokenId, thresholds);
  }

  async initializeDefaultThresholds(tokenId) {
    return this.orbitGovernance.initializeDefaultThresholds(tokenId);
  }

  async getHighVpMembers(stationId, minVotingPower) {
    return this.orbitGovernance.getHighVpMembers(stationId, minVotingPower);
  }

  async hasProposalPassed(tokenId, proposalType, yesVotes, noVotes, totalVp) {
    return this.orbitGovernance.hasProposalPassed(tokenId, proposalType, yesVotes, noVotes, totalVp);
  }
}

// Export for backward compatibility
export default UnifiedBackendService;
