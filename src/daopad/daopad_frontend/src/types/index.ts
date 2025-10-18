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

export type RequestOperation =
  | { Transfer: TransferOperation }
  | { AddUser: AddUserOperation }
  | { EditUser: EditUserOperation }
  | { AddAccount: AddAccountOperation }
  | { EditAccount: EditAccountOperation }
  | { AddAddressBookEntry: AddAddressBookEntryOperation }
  | { EditAddressBookEntry: EditAddressBookEntryOperation }
  | { RemoveAddressBookEntry: RemoveAddressBookEntryOperation }
  | { CreateExternalCanister: any }
  | { CallExternalCanister: any }
  | { EditPermission: EditPermissionOperation }
  | { AddRequestPolicy: AddRequestPolicyOperation }
  | { EditRequestPolicy: EditRequestPolicyOperation }
  | { RemoveRequestPolicy: RemoveRequestPolicyOperation }
  | { ManageSystemInfo: any }
  | { SetDisasterRecovery: any }
  | { ChangeExternalCanister: any };

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

export interface EditAccountOperation {
  account_id: string;
  name?: string;
  read_permission?: any;
  configs_permission?: any;
  transfer_permission?: any;
}

export interface AddAddressBookEntryOperation {
  address_owner: string;
  address: string;
  blockchain: string;
  standard: string;
  metadata?: Record<string, string>[];
}

export interface EditAddressBookEntryOperation {
  address_book_entry_id: string;
  address_owner?: string;
  change_metadata?: any;
}

export interface RemoveAddressBookEntryOperation {
  address_book_entry_id: string;
}

export interface EditPermissionOperation {
  resource: any;
  auth_scope?: any;
  users?: string[];
  groups?: string[];
}

export interface AddRequestPolicyOperation {
  specifier: any;
  rule: any;
}

export interface EditRequestPolicyOperation {
  policy_id: string;
  rule?: any;
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
export interface Permission {
  resource: any;
  auth_scope?: any;
  users: string[];
  groups: string[];
  allow: any;
}

export interface RequestPolicy {
  id: string;
  specifier: any;
  rule: any;
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
