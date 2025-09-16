use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct OrbitStationInfo {
    pub station_id: Principal,
    pub upgrader_id: Principal,
    pub name: String,
    pub owner: Principal,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize)]
pub struct CreateOrbitStationRequest {
    pub name: String,
}

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