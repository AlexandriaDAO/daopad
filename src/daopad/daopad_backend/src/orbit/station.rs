use candid::{Principal, Encode};
use crate::types::{
    OrbitStationResponse, SystemInit, SystemUpgraderInput,
    InitialConfig, WithAllDefaults, InitUserInput, UserIdentityInput, UserStatus, SystemInstall
};
use crate::orbit::management::{create_canister, deposit_cycles, install_canister};

const STATION_WASM: &[u8] = include_bytes!("../../wasms/station.wasm.gz");
const UPGRADER_WASM: &[u8] = include_bytes!("../../wasms/upgrader.wasm.gz");

pub async fn create_orbit_station_internal(name: String, _token_canister_id: Principal) -> Result<OrbitStationResponse, String> {
    const INITIAL_UPGRADER_CYCLES: u128 = 1_000_000_000_000; // 1T cycles
    const INITIAL_STATION_CYCLES: u128 = 1_000_000_000_000;  // 1T cycles

    let station_id = create_canister().await
        .map_err(|e| format!("Failed to create station canister: {:?}", e))?;

    let total_cycles_needed = INITIAL_UPGRADER_CYCLES + INITIAL_STATION_CYCLES;
    deposit_cycles(station_id, total_cycles_needed).await
        .map_err(|e| format!("Failed to deposit cycles to station: {:?}", e))?;

    let backend_principal = ic_cdk::id();
    let system_init = SystemInit {
        name: name.clone(),
        upgrader: SystemUpgraderInput::Deploy {
            wasm_module: UPGRADER_WASM.to_vec(),
            initial_cycles: Some(INITIAL_UPGRADER_CYCLES as u64),
        },
        fallback_controller: Some(backend_principal),
        initial_config: InitialConfig::WithAllDefaults(WithAllDefaults {
            users: vec![InitUserInput {
                id: None,
                name: "DAOPad Admin".to_string(),
                identities: vec![UserIdentityInput { identity: backend_principal }],
                groups: None,
                status: UserStatus::Active,
            }],
            admin_quorum: 1,
            operator_quorum: 1,
        }),
    };

    let system_install = SystemInstall::Init(system_init);

    install_canister(
        station_id,
        STATION_WASM.to_vec(),
        Encode!(&Some(system_install)).map_err(|e| format!("Failed to encode station init: {:?}", e))?
    ).await
    .map_err(|e| format!("Failed to install station: {:?}", e))?;

    // Station info storage is now handled by the calling function
    // to properly associate it with a token if needed

    Ok(OrbitStationResponse {
        station_id,
        upgrader_id: station_id,
        name: name,
    })
}