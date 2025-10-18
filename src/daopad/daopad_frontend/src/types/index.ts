// Centralized type exports

import { Principal } from '@dfinity/principal';
import type { Identity } from '@dfinity/agent';

// Token types
export interface Token {
  canister_id: string | Principal;
  symbol: string;
  name: string;
  decimals?: number;
  fee?: bigint | number;
  logo?: string;
  total_supply?: bigint | number;
}

export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  fee: bigint;
  logo?: string;
  total_supply?: bigint;
}

// Orbit Station types
export interface OrbitStation {
  station_id: string | Principal;
  name: string;
  labels?: string[];
}

// Proposal types
export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  created_at: bigint;
  voting_ends_at: bigint;
  votes_for: bigint;
  votes_against: bigint;
  threshold_percentage: number;
  orbit_request_id?: string;
  request_type?: string;
}

export type ProposalStatus =
  | { Open: null }
  | { Approved: null }
  | { Rejected: null }
  | { Executed: null };

// Request types (from Orbit)
export interface OrbitRequest {
  id: string;
  title: string;
  operation: RequestOperation | string;
  status: RequestStatus;
  created_at: bigint;
  approvals?: number;
  rejections?: number;
  summary?: string;
  requested_by?: Principal;
}

// Canister Method for external canister calls
export interface CanisterMethod {
  canister_id: Principal;
  method_name: string;
}

// External Canister Operation Types
export type CanisterKind =
  | { CreateNew: { initial_cycles?: bigint; subnet_selection?: SubnetSelection } }
  | { AddExisting: { canister_id: Principal } };

export type SubnetSelection =
  | { Specific: Principal }
  | { Any: null };

export interface CreateExternalCanisterOperation {
  name: string;
  kind: CanisterKind;
  labels?: string[];
  description?: string;
  metadata: Array<{ key: string; value: string }>;
}

export interface CallExternalCanisterOperation {
  validation_method?: CanisterMethod;
  execution_method: CanisterMethod;
  arg_checksum?: string;
  arg_rendering?: string;
  execution_method_cycles?: bigint;
  execution_method_reply?: Uint8Array;
  arg?: Uint8Array;
}

export interface ChangeExternalCanisterOperation {
  canister_id: Principal;
  mode: CanisterInstallMode;
  module: Uint8Array;
  arg?: Uint8Array;
}

export type CanisterInstallMode =
  | { Install: null }
  | { Reinstall: null }
  | { Upgrade: null };

// System Info Operation
export interface ManageSystemInfoOperation {
  name?: string;
  // Additional system info fields can be added here
}

// Disaster Recovery Operation
export interface SetDisasterRecoveryOperation {
  committee?: { user_group_id: string; quorum: number };
}

export type RequestOperation =
  | { Transfer: TransferOperation }
  | { AddUser: AddUserOperation }
  | { EditUser: EditUserOperation }
  | { AddAccount: AddAccountOperation }
  | { EditAccount: EditAccountOperation }
  | { AddAddressBookEntry: AddAddressBookEntryOperation }
  | { EditAddressBookEntry: EditAddressBookEntryOperation }
  | { RemoveAddressBookEntry: RemoveAddressBookEntryOperation }
  | { CreateExternalCanister: CreateExternalCanisterOperation }
  | { CallExternalCanister: CallExternalCanisterOperation }
  | { EditPermission: EditPermissionOperation }
  | { AddRequestPolicy: AddRequestPolicyOperation }
  | { EditRequestPolicy: EditRequestPolicyOperation }
  | { RemoveRequestPolicy: RemoveRequestPolicyOperation }
  | { ManageSystemInfo: ManageSystemInfoOperation }
  | { SetDisasterRecovery: SetDisasterRecoveryOperation }
  | { ChangeExternalCanister: ChangeExternalCanisterOperation };

export interface TransferOperation {
  from_account_id?: string;
  to: string;
  amount: bigint;
  metadata?: Record<string, string>;
  network?: string;
  fee?: bigint;
}

export interface AddUserOperation {
  name: string;
  identities: Principal[];
  groups: string[];
  status: string;
}

export interface EditUserOperation {
  user_id: string;
  name?: string;
  groups?: string[];
  status?: string;
}

export interface AddAccountOperation {
  name: string;
  blockchain: string;
  standard: string;
  metadata?: Record<string, string>[];
}

// Account permission types
export type AccountPermission =
  | { Public: null }
  | { Restricted: null }
  | { Private: null };

export interface EditAccountOperation {
  account_id: string;
  name?: string;
  read_permission?: AccountPermission;
  configs_permission?: AccountPermission;
  transfer_permission?: AccountPermission;
}

export interface AddAddressBookEntryOperation {
  address_owner: string;
  address: string;
  blockchain: string;
  standard: string;
  metadata?: Record<string, string>[];
}

// Metadata change operation
export type MetadataChange =
  | { ReplaceAllBy: Array<{ key: string; value: string }> }
  | { RemoveKeys: string[] }
  | { OverrideSpecifiedBy: Array<{ key: string; value: string }> };

export interface EditAddressBookEntryOperation {
  address_book_entry_id: string;
  address_owner?: string;
  change_metadata?: MetadataChange;
}

export interface RemoveAddressBookEntryOperation {
  address_book_entry_id: string;
}

// Resource and permission types
export type Resource =
  | { Account: { account_id: string } }
  | { AddressBook: { address_book_entry_id: string } }
  | { ChangeCanister: null }
  | { ExternalCanister: { canister_id: Principal; policies: string[] } }
  | { Permission: { resource: ResourceSpecifier } }
  | { RequestPolicy: { resource: ResourceSpecifier } }
  | { Request: { request_id: string } }
  | { System: null }
  | { User: { user_id: string } }
  | { UserGroup: { user_group_id: string } };

export type ResourceSpecifier =
  | { Any: null }
  | { Resource: Resource };

export type AuthScope =
  | { Restricted: null }
  | { Authenticated: null }
  | { Public: null };

export interface EditPermissionOperation {
  resource: ResourceSpecifier;
  auth_scope?: AuthScope;
  users?: string[];
  groups?: string[];
}

// Request policy types
export type UserSpecifier =
  | { Any: null }
  | { Group: string[] }
  | { Id: string[] };

export type RequestPolicyRule =
  | { AutoApproved: null }
  | { AllowListed: null }
  | { AllowListedByMetadata: { key: string; value: string } }
  | { Quorum: { min_approved: number; approvers: UserSpecifier } }
  | { QuorumPercentage: { min_approved: number; approvers: UserSpecifier } };

export interface AddRequestPolicyOperation {
  specifier: ResourceSpecifier;
  rule: RequestPolicyRule;
}

export interface EditRequestPolicyOperation {
  policy_id: string;
  rule?: RequestPolicyRule;
}

export interface RemoveRequestPolicyOperation {
  policy_id: string;
}

export type RequestStatus =
  | { Created: null }
  | { Approved: null }
  | { Rejected: null }
  | { Scheduled: { scheduled_at: bigint } }
  | { Processing: { started_at: bigint } }
  | { Completed: { completed_at: bigint } }
  | { Cancelled: { reason: string } }
  | { Failed: { reason: string } };

// Balance types
export interface Balance {
  token: Principal | string;
  amount: bigint;
  decimals: number;
  symbol: string;
  name?: string;
}

export interface Account {
  id: string;
  name: string;
  blockchain: string;
  standard: string;
  address?: string;
  balance?: bigint;
  decimals?: number;
  symbol?: string;
  metadata?: Record<string, string>[];
  last_modification_timestamp: bigint;
}

// Voting power
export interface VotingPower {
  user_principal: Principal | string;
  voting_power: bigint;
  percentage?: number;
}

export interface LPPosition {
  symbol: string;
  pool_id: string;
  pool_symbol: string;
  lp_token_amount: bigint;
  liquidity_usd: number;
  token_0: string;
  token_1: string;
  token_0_amount: bigint;
  token_1_amount: bigint;
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean;
  principal: Principal | null;
  identity: Identity | null;
  votingPower: bigint;
}

// Service response wrappers
export type Result<T, E = string> =
  | { Ok: T }
  | { Err: E };

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Address Book types
export interface AddressEntry {
  id: string;
  blockchain: string;
  address: string;
  address_owner: string;
  standard: string;
  metadata?: Record<string, string>[];
  last_modification_timestamp: bigint;
}

// Permission types
export type Allow =
  | { Read: null }
  | { Update: null }
  | { Delete: null };

export interface Permission {
  resource: ResourceSpecifier;
  auth_scope?: AuthScope;
  users: string[];
  groups: string[];
  allow: Allow;
}

export interface RequestPolicy {
  id: string;
  specifier: ResourceSpecifier;
  rule: RequestPolicyRule;
}

// User types
export interface User {
  id: string;
  name: string;
  identities: Principal[];
  groups: string[];
  status: string;
  last_modification_timestamp: bigint;
}

// Group types
export interface UserGroup {
  id: string;
  name: string;
  last_modification_timestamp: bigint;
}

// DAO Status
export interface DAOStatus {
  has_station: boolean;
  station_id?: Principal | string;
  is_valid: boolean;
  validation_errors?: string[];
}

// Component prop types
export interface TokenDashboardProps {
  token: Token;
  tokens?: Token[] | null;
  activeTokenIndex?: number;
  onTokenChange?: ((index: number) => void) | null;
  tokenVotingPowers?: Record<string, VotingPower[]> | null;
  identity: Identity | null;
  votingPower: bigint;
  lpPositions?: LPPosition[];
  onRefresh?: () => void;
}

export interface ProposalCardProps {
  proposal: Proposal;
  votingPower: bigint;
  totalVotingPower: bigint;
  onVote?: (proposalId: string, vote: boolean) => Promise<void>;
  onViewDetails?: (proposal: Proposal) => void;
}

// Navigation types
export interface NavItem {
  title: string;
  href: string;
  icon?: any;
  disabled?: boolean;
  external?: boolean;
}

// Filter types
export interface FilterState {
  search?: string;
  status?: string[];
  type?: string[];
  blockchain?: string[];
}

// Pagination types
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}
