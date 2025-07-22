mod orbit_integration;

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;

// Proposal types
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Principal,
    pub dao_name: String,
    pub status: ProposalStatus,
    pub created_at: u64,
    pub accepted_by: Option<Principal>,
    pub accepted_at: Option<u64>,
    pub station_id: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Pending,
    Accepted,
    Executed,
}

// Storage
thread_local! {
    static PROPOSALS: RefCell<HashMap<u64, Proposal>> = RefCell::new(HashMap::new());
    static NEXT_PROPOSAL_ID: RefCell<u64> = RefCell::new(1);
}

#[ic_cdk::init]
fn init(orbit_control_panel_id: Option<String>) {
    orbit_integration::init_control_panel(orbit_control_panel_id);
}

#[ic_cdk::query]
fn get_orbit_control_panel_id() -> String {
    orbit_integration::get_control_panel_id()
}

#[ic_cdk::update]
fn set_orbit_control_panel_id(canister_id: String) {
    orbit_integration::init_control_panel(Some(canister_id));
}

#[ic_cdk::update]
async fn register_with_orbit() -> Result<String, String> {
    orbit_integration::register_with_orbit().await
}

// Create a new proposal for a DAO
#[ic_cdk::update]
fn create_proposal(dao_name: String) -> Result<u64, String> {
    if dao_name.trim().is_empty() {
        return Err("DAO name cannot be empty".to_string());
    }

    let proposal_id = NEXT_PROPOSAL_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });

    let proposal = Proposal {
        id: proposal_id,
        proposer: ic_cdk::caller(),
        dao_name: dao_name.trim().to_string(),
        status: ProposalStatus::Pending,
        created_at: ic_cdk::api::time(),
        accepted_by: None,
        accepted_at: None,
        station_id: None,
    };

    PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal);
    });

    Ok(proposal_id)
}

// Accept a proposal and create the DAO (requires staked ALEX)
#[ic_cdk::update]
async fn accept_proposal(proposal_id: u64, staked_alex_balance: String) -> Result<String, String> {
    // Parse the staked balance
    let balance: f64 = staked_alex_balance.parse()
        .map_err(|_| "Invalid staked balance format".to_string())?;
    
    if balance <= 0.0 {
        return Err("Must have staked ALEX to accept proposals".to_string());
    }

    // Get and validate the proposal
    let mut proposal = PROPOSALS.with(|proposals| {
        proposals.borrow().get(&proposal_id).cloned()
    }).ok_or("Proposal not found".to_string())?;

    if proposal.status != ProposalStatus::Pending {
        return Err("Proposal is no longer pending".to_string());
    }

    // Update proposal status
    proposal.status = ProposalStatus::Accepted;
    proposal.accepted_by = Some(ic_cdk::caller());
    proposal.accepted_at = Some(ic_cdk::api::time());

    // Create the DAO
    let station_id = create_dao(proposal.dao_name.clone()).await?;
    proposal.station_id = Some(station_id.clone());
    proposal.status = ProposalStatus::Executed;

    // Save updated proposal
    PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal.clone());
    });

    Ok(format!("DAO created successfully! Station ID: {}", station_id))
}

// Get all proposals
#[ic_cdk::query]
fn list_proposals() -> Vec<Proposal> {
    PROPOSALS.with(|proposals| {
        let mut proposal_list: Vec<Proposal> = proposals.borrow().values().cloned().collect();
        proposal_list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        proposal_list
    })
}

// Get a specific proposal
#[ic_cdk::query]
fn get_proposal(proposal_id: u64) -> Option<Proposal> {
    PROPOSALS.with(|proposals| {
        proposals.borrow().get(&proposal_id).cloned()
    })
}

// Renamed from create_dao_treasury
async fn create_dao(dao_name: String) -> Result<String, String> {
    let treasury_name = format!("{} Treasury", dao_name);
    
    let station_id = orbit_integration::open_station(treasury_name).await?;
    Ok(station_id.to_text())
}

#[ic_cdk::update]
async fn get_orbit_stations() -> Result<Vec<(String, String)>, String> {
    let stations = orbit_integration::query_stations().await?;
    Ok(stations.into_iter()
        .map(|(id, name)| (id.to_text(), name))
        .collect())
}

#[ic_cdk::update]
async fn add_me_to_station(
    station_id: String, 
    my_orbit_principal: String
) -> Result<String, String> {
    // Parse inputs
    let station = candid::Principal::from_text(&station_id)
        .map_err(|_| "Invalid station ID".to_string())?;
    
    let orbit_principal = candid::Principal::from_text(&my_orbit_principal)
        .map_err(|_| "Invalid Orbit principal".to_string())?;
    
    // Add the user as operator
    orbit_integration::add_operator_to_station(station, orbit_principal).await
}