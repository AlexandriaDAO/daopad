use candid::{CandidType, Deserialize, Principal};
use ic_cdk::call;
use serde::Serialize;
use std::cell::RefCell;

// Default to mainnet control panel
const DEFAULT_CONTROL_PANEL_ID: &str = "wdqqk-naaaa-aaaaa-774aq-cai";

thread_local! {
    static CONTROL_PANEL_ID: RefCell<String> = RefCell::new(DEFAULT_CONTROL_PANEL_ID.to_string());
}

pub fn init_control_panel(canister_id: Option<String>) {
    CONTROL_PANEL_ID.with(|id| {
        *id.borrow_mut() = canister_id.unwrap_or_else(|| DEFAULT_CONTROL_PANEL_ID.to_string());
    });
}

pub fn get_control_panel_id() -> String {
    CONTROL_PANEL_ID.with(|id| id.borrow().clone())
}

#[derive(CandidType, Serialize, Deserialize)]
struct ApiError {
    code: String,
    message: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize)]
struct DeployStationInput {
    name: String,
    admins: Vec<DeployStationAdminUserInput>,
    associate_with_caller: Option<AssociateWithCallerInput>,
    subnet_selection: Option<()>,
}

#[derive(CandidType, Serialize, Deserialize)]
struct DeployStationAdminUserInput {
    username: String,
    identity: Principal,
}

#[derive(CandidType, Serialize, Deserialize)]
struct AssociateWithCallerInput {
    labels: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize)]
enum DeployStationResult {
    Ok { canister_id: Principal },
    Err(ApiError),
}

// Group IDs from Orbit's system (for future use)
// const ADMIN_GROUP_ID: u128 = 302240678275694148452352;
// const OPERATOR_GROUP_ID: u128 = 302240678275694148452353;

pub async fn open_station(station_name: String) -> Result<Principal, String> {
    let control_panel = Principal::from_text(&get_control_panel_id())
        .map_err(|e| format!("Invalid principal: {}", e))?;
    
    // Only the backend canister will be admin
    let treasury_controller = ic_cdk::id();
    
    let args = DeployStationInput {
        name: station_name.clone(),
        admins: vec![
            DeployStationAdminUserInput {
                username: format!("{} Controller", station_name),
                identity: treasury_controller,
            }
        ],
        associate_with_caller: Some(AssociateWithCallerInput { 
            labels: vec!["daopad".to_string(), "dao-treasury".to_string()] 
        }),
        subnet_selection: None,
    };
    
    let result: Result<(DeployStationResult,), _> = call(
        control_panel,
        "deploy_station",
        (args,)
    ).await;
    
    match result {
        Ok((DeployStationResult::Ok { canister_id },)) => Ok(canister_id),
        Ok((DeployStationResult::Err(api_error),)) => 
            Err(format!("API Error: {} - {:?}", api_error.code, api_error.message)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

#[derive(CandidType, Serialize, Deserialize)]
struct UserStation {
    canister_id: Principal,
    name: String,
    labels: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize)]
struct ListUserStationsInput {
    filter_by_labels: Option<Vec<String>>,
}

#[derive(CandidType, Serialize, Deserialize)]
enum ListUserStationsResult {
    Ok { stations: Vec<UserStation> },
    Err(ApiError),
}

#[derive(CandidType, Serialize, Deserialize)]
struct RegisterUserInput {
    station: Option<UserStation>,
}

#[derive(CandidType, Serialize, Deserialize)]
struct User {
    identity: Principal,
    subscription_status: UserSubscriptionStatus,
    last_active: String,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
enum UserSubscriptionStatus {
    Unsubscribed,
    Pending,
    Approved,
    Denylisted,
}

#[derive(CandidType, Serialize, Deserialize)]
enum RegisterUserResult {
    Ok { user: User },
    Err(ApiError),
}

pub async fn register_with_orbit() -> Result<String, String> {
    let control_panel = Principal::from_text(&get_control_panel_id())
        .map_err(|e| format!("Invalid principal: {}", e))?;
    
    let args = RegisterUserInput { station: None };
    
    let result: Result<(RegisterUserResult,), _> = call(
        control_panel,
        "register_user",
        (args,)
    ).await;
    
    match result {
        Ok((RegisterUserResult::Ok { user },)) => Ok(format!("Registered with status: {:?}", user.subscription_status)),
        Ok((RegisterUserResult::Err(api_error),)) => {
            if api_error.code == "ALREADY_REGISTERED" {
                Ok("Already registered".to_string())
            } else {
                Err(format!("API Error: {} - {:?}", api_error.code, api_error.message))
            }
        }
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

pub async fn query_stations() -> Result<Vec<(Principal, String)>, String> {
    let control_panel = Principal::from_text(&get_control_panel_id())
        .map_err(|e| format!("Invalid principal: {}", e))?;
    
    let args = ListUserStationsInput {
        filter_by_labels: Some(vec!["daopad".to_string()]),
    };
    
    let result: Result<(ListUserStationsResult,), _> = call(
        control_panel,
        "list_user_stations",
        (args,)
    ).await;
    
    match result {
        Ok((ListUserStationsResult::Ok { stations },)) => {
            Ok(stations.into_iter()
                .map(|s| (s.canister_id, s.name))
                .collect())
        }
        Ok((ListUserStationsResult::Err(api_error),)) => 
            Err(format!("API Error: {} - {:?}", api_error.code, api_error.message)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}