use candid::{CandidType, Deserialize, Principal};

pub type OrbitStationInfo = Principal;


#[derive(CandidType, Deserialize)]
pub struct CreateTokenStationRequest {
    pub name: String,
    pub token_canister_id: Principal,
}

#[derive(CandidType, Deserialize)]
pub struct OrbitStationResponse {
    pub station_id: Principal,
    pub upgrader_id: Principal,
    pub name: String,
}

#[derive(CandidType, Deserialize)]
pub enum SystemUpgraderInput {
    Id(Principal),
    Deploy {
        wasm_module: Vec<u8>,
        initial_cycles: Option<u64>,
    },
}

#[derive(CandidType, Deserialize)]
pub enum UserStatus {
    Active,
    Inactive,
}

#[derive(CandidType, Deserialize)]
pub struct UserIdentityInput {
    pub identity: Principal,
}

#[derive(CandidType, Deserialize)]
pub struct InitUserInput {
    pub id: Option<String>,
    pub name: String,
    pub identities: Vec<UserIdentityInput>,
    pub groups: Option<Vec<String>>,
    pub status: UserStatus,
}

#[derive(CandidType, Deserialize)]
pub struct WithAllDefaults {
    pub users: Vec<InitUserInput>,
    pub admin_quorum: u16,
    pub operator_quorum: u16,
}

#[derive(CandidType, Deserialize)]
pub enum InitialConfig {
    WithAllDefaults(WithAllDefaults),
}

#[derive(CandidType, Deserialize)]
pub struct SystemInit {
    pub name: String,
    pub upgrader: SystemUpgraderInput,
    pub fallback_controller: Option<Principal>,
    pub initial_config: InitialConfig,
}

#[derive(CandidType, Deserialize)]
pub enum SystemInstall {
    Init(SystemInit),
}

#[derive(CandidType, Deserialize)]
pub struct UpgraderInitArg {
    pub target_canister: Principal,
}

// Types for adding users to Orbit Station
#[derive(CandidType, Deserialize)]
pub struct AddUserOperationInput {
    pub name: String,
    pub identities: Vec<Principal>,
    pub groups: Vec<String>,
    pub status: UserStatus,
}

#[derive(CandidType, Deserialize)]
pub enum RequestOperationInput {
    AddUser(AddUserOperationInput),
}

#[derive(CandidType, Deserialize)]
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

#[derive(CandidType, Deserialize)]
pub struct RequestCallerPrivilegesDTO {
    pub id: String,
    pub can_approve: bool,
}

#[derive(CandidType, Deserialize)]
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
    Err(String),
}

