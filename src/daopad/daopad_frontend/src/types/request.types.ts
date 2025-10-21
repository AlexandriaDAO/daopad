import { Principal } from '@dfinity/principal';
import type { ResourceSpecifier, AuthScope } from './user.types';
import type { CanisterMethod, CanisterKind, CanisterInstallMode } from './canister.types';

// Approval status for requests
export interface RequestApproval {
  approver_id: string;
  status: 'Approved' | 'Rejected';
  decided_at: bigint;
}

// Request types (from Orbit)
export interface OrbitRequest {
  id: string;
  title: string;
  operation: RequestOperation | string;
  status: RequestStatus;
  created_at: bigint;
  approvals?: RequestApproval[];
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

export interface EditPermissionOperation {
  resource: ResourceSpecifier;
  auth_scope?: AuthScope;
  users?: string[];
  groups?: string[];
}

// Request policy operation types (imported from user.types.ts)
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

// Re-export RequestPolicyRule from user.types for convenience
export type { RequestPolicyRule, UserSpecifier } from './user.types';

// System Info Operation
export interface ManageSystemInfoOperation {
  name?: string;
  // Additional system info fields can be added here
}

// Disaster Recovery Operation
export interface SetDisasterRecoveryOperation {
  committee?: { user_group_id: string; quorum: number };
}

// Re-export canister operation types
export type { CreateExternalCanisterOperation, CallExternalCanisterOperation, ChangeExternalCanisterOperation } from './canister.types';

export type RequestStatus =
  | { Created: null }
  | { Approved: null }
  | { Rejected: null }
  | { Scheduled: { scheduled_at: bigint } }
  | { Processing: { started_at: bigint } }
  | { Completed: { completed_at: bigint } }
  | { Cancelled: { reason: string } }
  | { Failed: { reason: string } };
