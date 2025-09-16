use candid::Principal;
use ic_cdk::{call, api::call::call_with_payment128};

pub async fn create_canister() -> Result<Principal, String> {
    const CANISTER_CREATION_CYCLES: u64 = 1_500_000_000_000;

    let create_args = ic_cdk::api::management_canister::main::CreateCanisterArgument {
        settings: None,
    };

    let result: Result<(ic_cdk::api::management_canister::main::CanisterIdRecord,), _> =
        call_with_payment128(
            Principal::management_canister(),
            "create_canister",
            (create_args,),
            CANISTER_CREATION_CYCLES as u128
        ).await;

    match result {
        Ok((canister_id,)) => Ok(canister_id.canister_id),
        Err((_, msg)) => Err(msg),
    }
}

pub async fn install_canister(canister_id: Principal, wasm: Vec<u8>, arg: Vec<u8>) -> Result<(), String> {
    let install_args = ic_cdk::api::management_canister::main::InstallCodeArgument {
        mode: ic_cdk::api::management_canister::main::CanisterInstallMode::Install,
        canister_id,
        wasm_module: wasm,
        arg,
    };

    let result: Result<(), _> = call(Principal::management_canister(), "install_code", (install_args,)).await;
    match result {
        Ok(()) => Ok(()),
        Err((_, msg)) => Err(msg),
    }
}

pub async fn deposit_cycles(canister_id: Principal, cycles: u128) -> Result<(), String> {
    let deposit_args = ic_cdk::api::management_canister::main::CanisterIdRecord {
        canister_id,
    };

    let result: Result<(), _> = call_with_payment128(
        Principal::management_canister(),
        "deposit_cycles",
        (deposit_args,),
        cycles
    ).await;

    match result {
        Ok(()) => Ok(()),
        Err((_, msg)) => Err(msg),
    }
}

pub async fn delete_canister(canister_id: Principal) -> Result<(), String> {
    let delete_args = ic_cdk::api::management_canister::main::CanisterIdRecord {
        canister_id,
    };

    let result: Result<(), _> = call(Principal::management_canister(), "delete_canister", (delete_args,)).await;
    match result {
        Ok(()) => Ok(()),
        Err((_, msg)) => Err(msg),
    }
}