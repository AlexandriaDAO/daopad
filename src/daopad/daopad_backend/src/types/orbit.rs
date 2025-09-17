use candid::{CandidType, Deserialize, Principal};

// Types needed for joining Orbit Station

#[derive(CandidType, Deserialize)]
pub enum UserStatus {
    Active,
    Inactive,
}

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

// Types for verifying admin status
#[derive(CandidType, Deserialize)]
pub struct Admin {
    pub id: Principal,
    pub name: String,
}

#[derive(CandidType, Deserialize)]
pub struct SystemInfo {
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: u64,
    pub upgrader_cycles: Option<u64>,
    pub admins: Vec<Admin>,
}

#[derive(CandidType, Deserialize)]
pub enum GetResult<T> {
    Ok(T),
    Err(String),
}