// Minimal API types needed for admin canister to approve/reject Orbit requests
use candid::{CandidType, Deserialize};

/// Result type for submit_request_approval
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum SubmitRequestApprovalResult {
    Ok(()),
    Err(Error),
}

/// Request approval status
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RequestApprovalStatus {
    Approved,
    Rejected,
}

/// Input for submitting request approval/rejection
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SubmitRequestApprovalInput {
    pub request_id: String,
    pub decision: RequestApprovalStatus,
    pub reason: Option<String>,
}

/// Error type from Orbit API calls
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Error {
    pub code: String,
    pub message: Option<String>,
    pub details: Option<Vec<(String, String)>>,
}
