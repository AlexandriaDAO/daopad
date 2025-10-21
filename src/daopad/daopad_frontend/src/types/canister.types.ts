import { Principal } from '@dfinity/principal';

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
