import { Principal } from '@dfinity/principal';

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

export interface RequestPolicy {
  id: string;
  specifier: ResourceSpecifier;
  rule: RequestPolicyRule;
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
