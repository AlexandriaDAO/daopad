// External canister-related types for Orbit Station
// Domain: External canister management, monitoring, snapshots, and lifecycle operations

use candid::{CandidType, Nat, Principal};
use serde::{Deserialize, Serialize};

use super::system::{PaginationInput, Error, Allow, PaginationInputMinimal};
use super::requests::RequestPolicyRule;

// ===== NEW TYPES FOR SECURITY BYPASS DETECTION =====

// System restore types for time-travel attack detection
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum SystemRestoreTarget {
    RestoreStation,
    RestoreUpgrader,
}

// AddressBook metadata for whitelist injection detection
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct AddressBookMetadata {
    pub key: String,
    pub value: String,
}

// External canister call types for arbitrary execution detection
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct CanisterMethod {
    pub canister_id: Principal,
    pub method_name: String,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum CallExternalCanisterResourceTarget {
    Any,
    Canister(Principal),
}

// Snapshot operation types for state manipulation detection
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum SnapshotOperation {
    Snapshot,
    Restore,
    Prune,
}

// ===== EXTERNAL CANISTER TYPES =====

// External canister management types
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanister {
    pub id: String, // UUID
    pub canister_id: Principal,
    pub name: String,
    pub description: Option<String>,
    pub labels: Vec<String>,
    pub metadata: Vec<(String, String)>,
    pub state: ExternalCanisterState,
    pub permissions: ExternalCanisterPermissions,
    pub request_policies: ExternalCanisterRequestPolicies,
    pub created_at: String,
    pub modified_at: Option<String>,
    pub monitoring: Option<MonitoringConfig>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ExternalCanisterState {
    Active,
    Archived,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanisterPermissions {
    pub read: Allow,
    pub change: Allow,
    pub calls: Vec<ExternalCanisterCallPermission>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanisterCallPermission {
    pub allow: Allow,
    pub execution_method: String,
    pub validation_method: ExternalCanisterValidationMethodType,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum ExternalCanisterValidationMethodType {
    No,
    Quorum(ExternalCanisterQuorumValidationMethod),
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanisterQuorumValidationMethod {
    pub min_approvers: u16,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct ExternalCanisterRequestPolicies {
    pub change: Vec<RequestPolicyWithAccount>,
    pub calls: Vec<RequestPolicyWithAccount>,
}

// Using the existing RequestPolicyRule with a simpler wrapper for external canisters
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct RequestPolicyWithAccount {
    pub policy_id: Option<String>,
    pub rule: RequestPolicyRule,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct MonitoringConfig {
    pub strategy: MonitoringStrategy,
    pub funding_amount: Nat,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum MonitoringStrategy {
    Always,
    BelowThreshold { min_cycles: Nat },
    BelowEstimatedRuntime { runtime_seconds: u64 },
}

// List external canisters
#[derive(CandidType, Deserialize, Debug)]
pub struct ListExternalCanistersInput {
    pub canister_ids: Option<Vec<Principal>>,
    pub labels: Option<Vec<String>>,
    pub states: Option<Vec<ExternalCanisterState>>,
    pub paginate: Option<PaginationInput>,
    pub sort_by: Option<ListExternalCanistersSortInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct ListExternalCanistersSortInput {
    pub field: String,  // "name", "created_at", etc.
    pub direction: SortDirection,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct ExternalCanisterCallerPrivileges {
    pub id: String,  // UUID
    pub canister_id: Principal,
    pub can_change: bool,
    pub can_fund: bool,
    pub can_call: Vec<String>,  // Method names that can be called
}

// The actual result is wrapped in Ok/Err variant
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum ListExternalCanistersResult {
    Ok {
        canisters: Vec<ExternalCanister>,
        next_offset: Option<u64>,
        total: u64,
        privileges: Vec<ExternalCanisterCallerPrivileges>,
    },
    Err(Error),
}

// Get external canister
#[derive(CandidType, Deserialize, Debug)]
pub struct GetExternalCanisterInput {
    pub external_canister_id: String,  // UUID for most operations
}

// For get_external_canister which needs Principal
#[derive(CandidType, Deserialize, Debug)]
pub struct GetExternalCanisterByPrincipalInput {
    pub canister_id: Principal,  // The actual canister Principal
}

#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum GetExternalCanisterResult {
    Ok {
        canister: ExternalCanister,
        privileges: ExternalCanisterCallerPrivileges,
    },
    Err(Error),
}

// External canister ID for requests
#[derive(CandidType, Deserialize, Debug)]
pub struct ExternalCanisterIdInput {
    pub external_canister_id: String,
}

// Create external canister operation
#[derive(CandidType, Deserialize, Debug)]
pub struct CreateExternalCanisterOperationInput {
    pub kind: CreateExternalCanisterKind,
    pub name: String,
    pub description: Option<String>,
    pub labels: Vec<String>,
    pub metadata: Vec<(String, String)>,
    pub permissions: ExternalCanisterPermissions,
    pub request_policies: ExternalCanisterRequestPolicies,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum CreateExternalCanisterKind {
    CreateNew(CreateExternalCanisterOptions),
    AddExisting { canister_id: Principal },
}

#[derive(CandidType, Deserialize, Debug)]
pub struct CreateExternalCanisterOptions {
    pub subnet_selection: Option<SubnetSelection>,
    pub initial_cycles: Option<Nat>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum SubnetSelection {
    Subnet { subnet_id: Principal },
}

// Change external canister operation
#[derive(CandidType, Deserialize, Debug)]
pub struct ChangeExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub kind: ChangeExternalCanisterKind,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ChangeExternalCanisterKind {
    Upgrade(UpgradeExternalCanisterInput),
    NativeSettings(NativeCanisterSettingsInput),
    Settings(ExternalCanisterSettingsInput),
    State(ExternalCanisterState),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct UpgradeExternalCanisterInput {
    pub mode: CanisterInstallMode,
    pub wasm_module: Vec<u8>,
    pub arg: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum CanisterInstallMode {
    #[serde(rename = "install")]
    Install,
    #[serde(rename = "reinstall")]
    Reinstall,
    #[serde(rename = "upgrade")]
    Upgrade,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct NativeCanisterSettingsInput {
    pub controllers: Option<Vec<Principal>>,
    pub compute_allocation: Option<Nat>,
    pub memory_allocation: Option<Nat>,
    pub freezing_threshold: Option<Nat>,
    pub reserved_cycles_limit: Option<Nat>,
    pub log_visibility: Option<LogVisibility>,
    pub wasm_memory_limit: Option<Nat>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum LogVisibility {
    #[serde(rename = "public")]
    Public,
    #[serde(rename = "controllers")]
    Controllers,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct ExternalCanisterSettingsInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub labels: Option<Vec<String>>,
    pub metadata: Option<Vec<(String, String)>>,
}

// Configure external canister operation
#[derive(CandidType, Deserialize, Debug)]
pub struct ConfigureExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub kind: ConfigureExternalCanisterKind,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ConfigureExternalCanisterKind {
    Permissions(ExternalCanisterPermissions),
    RequestPolicies(ExternalCanisterRequestPolicies),
    CallPermission(Vec<ExternalCanisterCallPermission>),
}

// Call external canister
#[derive(CandidType, Deserialize, Debug)]
pub struct ExternalCanisterCallerMethodCallInput {
    pub method_name: String,
    pub arg: Option<Vec<u8>>,
    pub cycles: Option<Nat>,
    pub validation_method: Option<ExternalCanisterValidationMethodInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct ExternalCanisterValidationMethodInput {
    pub method_name: String,
    pub arg: Option<Vec<u8>>,
}

// Fund external canister
#[derive(CandidType, Deserialize, Debug)]
pub struct FundExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub kind: FundExternalCanisterKind,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum FundExternalCanisterKind {
    Send(FundExternalCanisterSendCyclesInput),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct FundExternalCanisterSendCyclesInput {
    pub cycles: Nat,
}

// Monitor external canister
#[derive(CandidType, Deserialize, Debug)]
pub struct MonitorExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub kind: MonitorExternalCanisterKind,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum MonitorExternalCanisterKind {
    Start(MonitorExternalCanisterStartInput),
    Stop,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct MonitorExternalCanisterStartInput {
    pub strategy: MonitoringStrategy,
    pub funding_amount: Nat,
}

// Snapshot operations
#[derive(CandidType, Deserialize, Debug)]
pub struct SnapshotExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub force: bool,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct RestoreExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub snapshot_id: String,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct PruneExternalCanisterOperationInput {
    pub external_canister_id: String,
    pub snapshot_ids: Vec<String>,
}

// Snapshot query types (matching Orbit Station API)
#[derive(CandidType, Deserialize, Debug)]
pub struct CanisterSnapshotsInput {
    pub canister_id: Principal,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CanisterSnapshot {
    pub snapshot_id: String,
    pub taken_at_timestamp: String,
    pub total_size: u64,
}

pub type CanisterSnapshotsResponse = Vec<CanisterSnapshot>;

#[derive(CandidType, Deserialize, Debug)]
pub enum CanisterSnapshotsResult {
    Ok(CanisterSnapshotsResponse),
    Err(Error),
}

/// Minimal ListExternalCanistersInput for INPUT (sending to Orbit)
/// Uses empty vecs and concrete PaginationInputMinimal instead of Option<T>
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct ListExternalCanistersInputMinimal {
    pub canister_ids: Vec<Principal>,  // Empty vec instead of None
    pub labels: Vec<String>,  // Empty vec instead of None
    pub states: Vec<ExternalCanisterState>,  // Empty vec instead of None
    pub paginate: PaginationInputMinimal,  // Always include
    // sort_by removed - not critical for basic listing
}
