// Request-related types for Orbit Station
// Domain: Request operations, request policies, and approval workflows

use candid::{CandidType, Nat};
use serde::{Deserialize, Serialize};

use super::system::{Error, UUID, PaginationInput};
use super::users::{AddUserOperationInput, EditUserOperationInput, UserSpecifier};
use super::accounts::{AccountMetadata, AddAccountOperationInput, EditAccountOperationInput};
use super::assets::{AddAssetOperationInput, EditAssetOperationInput, RemoveAssetOperationInput};
use super::permissions::{EditPermissionOperationInput, ResourceSpecifier};
use super::external_canisters::*;

#[derive(CandidType, Deserialize)]
pub enum RequestOperationInput {
    AddUser(AddUserOperationInput),
    EditUser(EditUserOperationInput),
    EditPermission(EditPermissionOperationInput),
    AddAccount(AddAccountOperationInput),
    EditAccount(EditAccountOperationInput),
    AddAsset(AddAssetOperationInput),
    EditAsset(EditAssetOperationInput),
    RemoveAsset(RemoveAssetOperationInput),
}

#[derive(CandidType, Deserialize, Debug)]
pub enum RequestExecutionSchedule {
    Immediate,
}

#[derive(CandidType, Deserialize)]
pub struct CreateRequestInput {
    pub operation: RequestOperationInput,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub execution_plan: Option<RequestExecutionSchedule>,
    pub expiration_dt: Option<String>, // RFC3339 timestamp
}

// Response types for Orbit Station
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct RequestDTO {
    pub id: String,
    pub title: String,
    pub status: RequestStatusDTO,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum RequestStatusDTO {
    Created,
    Approved,
    Rejected,
    Cancelled { reason: Option<String> },
    Scheduled { scheduled_at: String },
    Processing { started_at: String },
    Completed { completed_at: String },
    Failed { reason: Option<String> },
}

#[derive(CandidType, Deserialize, Debug)]
pub struct RequestCallerPrivilegesDTO {
    pub id: String,
    pub can_approve: bool,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct RequestAdditionalInfoDTO {
    pub id: String,
    pub requester_name: String,
}

#[derive(CandidType, Deserialize)]
pub struct CreateRequestResponse {
    pub request: RequestDTO,
    pub privileges: RequestCallerPrivilegesDTO,
    pub additional_info: RequestAdditionalInfoDTO,
}

#[derive(CandidType, Deserialize)]
pub enum CreateRequestResult {
    Ok(CreateRequestResponse),
    Err(Error),
}

// Transfer operation types (used by orbit_transfers module)
#[derive(CandidType, Deserialize, Debug)]
pub struct TransferOperationInput {
    pub from_account_id: String, // UUID from Orbit account
    pub from_asset_id: String,   // UUID from Orbit asset
    pub with_standard: String,   // "icp" or "icrc1"
    pub to: String,              // Destination address
    pub amount: Nat,             // Amount in smallest units
    pub fee: Option<Nat>,        // Optional fee
    pub metadata: Vec<TransferMetadata>,
    pub network: Option<super::system::NetworkInput>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct TransferMetadata {
    pub key: String,
    pub value: String,
}

// Request policy rules for accounts
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct QuorumPercentage {
    pub approvers: UserSpecifier,  // The users that are required to approve
    pub min_approved: u16,         // nat16 in candid, not u32!
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Quorum {
    pub approvers: UserSpecifier,  // The users that can approve
    pub min_approved: u16,         // nat16 in candid, not u32!
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum RequestPolicyRule {
    AutoApproved,
    QuorumPercentage(QuorumPercentage),
    Quorum(Quorum),
    AllowListedByMetadata(AccountMetadata),
    AllowListed,
    AnyOf(Vec<RequestPolicyRule>),
    AllOf(Vec<RequestPolicyRule>),
    Not(Box<RequestPolicyRule>),
    NamedRule(String), // UUID
}

// Enhanced RequestOperation enum with canister operations
#[derive(CandidType, Deserialize, Debug)]
pub enum RequestOperation {
    AddUser(AddUserOperationInput),
    EditUser(EditUserOperationInput),
    EditPermission(EditPermissionOperationInput),
    AddAccount(AddAccountOperationInput),
    Transfer(TransferOperationInput),
    CreateExternalCanister(CreateExternalCanisterOperationInput),
    ChangeExternalCanister(ChangeExternalCanisterOperationInput),
    ConfigureExternalCanister(ConfigureExternalCanisterOperationInput),
    CallExternalCanister(ExternalCanisterIdInput, ExternalCanisterCallerMethodCallInput),
    FundExternalCanister(FundExternalCanisterOperationInput),
    MonitorExternalCanister(MonitorExternalCanisterOperationInput),
    SnapshotExternalCanister(SnapshotExternalCanisterOperationInput),
    RestoreExternalCanister(RestoreExternalCanisterOperationInput),
    PruneExternalCanister(PruneExternalCanisterOperationInput),
}

// Submit request input with RequestOperation
#[derive(CandidType, Deserialize, Debug)]
pub struct SubmitRequestInput {
    pub operation: RequestOperation,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub execution_plan: Option<RequestExecutionSchedule>,
}

// Submit request result
#[derive(CandidType, Deserialize, Debug)]
pub struct SubmitRequestResponse {
    pub request: RequestDTO,
    pub privileges: RequestCallerPrivilegesDTO,
    pub additional_info: RequestAdditionalInfoDTO,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum SubmitRequestResult {
    Ok(SubmitRequestResponse),
    Err(Error),
}

// Request policies
#[derive(CandidType, Deserialize, Serialize)]
pub struct ListRequestPoliciesInput {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct RequestPolicy {
    pub id: String,
    pub specifier: RequestSpecifier,
    pub rule: RequestPolicyRule,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum IdListSpecifier {
    Ids(Vec<String>),
    Any,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum RequestSpecifier {
    AddUser,
    EditUser(ResourceSpecifier),
    RemoveUser,
    Transfer(IdListSpecifier),
    AddAccount,
    EditAccount(IdListSpecifier),
    RemoveAccount,
    AddAsset,
    EditAsset(ResourceSpecifier),
    RemoveAsset(ResourceSpecifier),
    ChangeCanister,
    SetDisasterRecovery,
    ChangeExternalCanister(ResourceSpecifier),
    CreateExternalCanister,
    CallExternalCanister(candid::Principal),
    EditPermission(ResourceSpecifier),
    EditRequestPolicy(ResourceSpecifier),
    RemoveRequestPolicy(ResourceSpecifier),
    ManageSystemInfo,
    // Missing variants from actual Orbit responses:
    AddUserGroup,
    RemoveUserGroup(ResourceSpecifier),
    AddNamedRule,
    EditNamedRule(ResourceSpecifier),
    RemoveNamedRule(ResourceSpecifier),
    EditAddressBookEntry(ResourceSpecifier),
    RemoveAddressBookEntry(ResourceSpecifier),
    FundExternalCanister(ResourceSpecifier),
    SystemUpgrade,
    AddRequestPolicy,
    EditUserGroup(ResourceSpecifier),
    AddAddressBookEntry,
}

#[derive(CandidType, Deserialize)]
pub struct RequestPolicyCallerPrivileges {
    pub id: String,
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(CandidType, Deserialize)]
pub enum ListRequestPoliciesResult {
    Ok {
        policies: Vec<RequestPolicy>,
        privileges: Vec<RequestPolicyCallerPrivileges>,
        total: u64,
        next_offset: Option<u64>,
    },
    Err(Error),
}

// New types for Request Policies Details endpoint
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct RequestPolicyInfo {
    pub operation: String,        // Human-readable operation name
    pub approval_rule: String,     // Human-readable approval requirement
    pub specifier: RequestSpecifier,  // Raw specifier for filtering
    pub rule: RequestPolicyRule,      // Raw rule for analysis
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct RequestPoliciesDetails {
    pub policies: Vec<RequestPolicyInfo>,
    pub total_count: usize,
    pub auto_approved_count: usize,
    pub bypass_count: usize,
}
