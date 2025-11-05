// System-related types for Orbit Station
// Domain: System information, configuration, disaster recovery, and address book

use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use std::fmt;

use super::requests::RequestPolicyRule;

#[derive(CandidType, Deserialize, Debug)]
pub struct NetworkInput {
    pub id: String,
    pub name: String,
}

// Response type for join_orbit_station method
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct JoinMemberResponse {
    pub request_id: String,
    pub status: String,
    pub auto_approved: bool,
    pub failure_reason: Option<String>,
}

// Types for verifying admin status
#[derive(CandidType, Deserialize, Debug, Clone, Serialize)]
pub struct Error {
    pub code: String,
    pub message: Option<String>,
    pub details: Option<Vec<(String, String)>>,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.message {
            Some(message) if !message.is_empty() => {
                write!(f, "{} ({})", message, self.code)
            }
            _ => write!(f, "{}", self.code),
        }
    }
}

// Authorization types for account permissions
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub enum AuthScope {
    Public,
    Authenticated,
    Restricted,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct Allow {
    pub auth_scope: AuthScope,
    pub users: Vec<String>,       // UUIDs
    pub user_groups: Vec<String>, // UUIDs
}

// System Info types for DAO Settings
#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct SystemInfo {
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: u64,
    pub upgrader_cycles: Option<u64>,
    pub last_upgrade_timestamp: String, // RFC3339 timestamp
    pub raw_rand_successful: bool,
    pub disaster_recovery: Option<DisasterRecovery>,
    pub cycle_obtain_strategy: CycleObtainStrategy,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct DisasterRecovery {
    pub committee: DisasterRecoveryCommittee,
    pub user_group_name: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct DisasterRecoveryCommittee {
    pub user_group_id: String, // UUID as string
    pub quorum: u16,
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub enum CycleObtainStrategy {
    Disabled,
    MintFromNativeToken {
        account_id: String, // UUID as string
        account_name: Option<String>,
    },
    WithdrawFromCyclesLedger {
        account_id: String, // UUID as string
        account_name: Option<String>,
    },
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub enum SystemInfoResult {
    Ok { system: SystemInfo },
    Err(Error),
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct SystemInfoResponse {
    pub station_id: Principal,
    pub system_info: SystemInfo,
}

// UUID type for user/group IDs (standard format)
pub type UUID = String; // Format: "00000000-0000-4000-8000-000000000000"

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PaginationInput {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

// Named Rule types for fetching human-readable rule names
#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct NamedRule {
    pub id: String,  // UUID
    pub name: String,
    pub rule: RequestPolicyRule,
    pub description: Option<String>,
}

#[derive(CandidType, Deserialize)]
pub enum ListNamedRulesResult {
    Ok {
        named_rules: Vec<NamedRule>,
        next_offset: Option<u64>,
        total: u64,
        privileges: Vec<NamedRuleCallerPrivileges>,
    },
    Err(Error),
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct NamedRuleCallerPrivileges {
    pub id: String,  // UUID
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(CandidType, Serialize)]
pub struct ListNamedRulesInput {
    pub paginate: Option<PaginationInput>,
}

/// Minimal SystemInfo for deserialization - removes all Option<T> fields
/// that cause "Not a valid visitor: OptionVisitor" errors
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct SystemInfoMinimal {
    pub name: String,
    pub version: String,
    pub upgrader_id: Principal,
    pub cycles: u64,
    // upgrader_cycles removed - not critical for display
    pub last_upgrade_timestamp: String,
    pub raw_rand_successful: bool,
    // disaster_recovery removed - can query separately if needed
    pub cycle_obtain_strategy: CycleObtainStrategyMinimal,
}

/// Minimal CycleObtainStrategy - removes Option<String> account_name
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum CycleObtainStrategyMinimal {
    Disabled,
    MintFromNativeToken {
        account_id: String,
        // account_name removed - not critical
    },
    WithdrawFromCyclesLedger {
        account_id: String,
        // account_name removed - not critical
    },
}

/// Minimal SystemInfoResult using minimal types
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub enum SystemInfoResultMinimal {
    Ok { system: SystemInfoMinimal },
    Err(Error),
}

/// Minimal SystemInfoResponse using minimal types
#[derive(CandidType, Deserialize, Serialize, Debug)]
pub struct SystemInfoResponseMinimal {
    pub station_id: Principal,
    pub system_info: SystemInfoMinimal,
}

/// Minimal PaginationInput for INPUT (sending to Orbit)
/// Uses concrete types instead of Option<T>
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PaginationInputMinimal {
    pub offset: u64,  // Default to 0 if not filtering
    pub limit: u16,   // Default to 50 if not filtering
}

// Address book query types
#[derive(CandidType, Serialize, Debug)]
pub struct ListAddressBookInput {
    pub ids: Option<Vec<String>>,
    pub addresses: Option<Vec<String>>,
    pub paginate: Option<PaginationInput>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct OrbitAddressBookEntry {
    pub id: String,
    pub address_owner: String,
    pub address: String,
    pub blockchain: String,
    pub metadata: Vec<super::accounts::AccountMetadata>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct AddressBookPrivilege {
    pub id: String,
    pub can_edit: bool,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ListAddressBookResult {
    Ok {
        address_book_entries: Vec<OrbitAddressBookEntry>,
        next_offset: Option<u64>,
        total: u64,
        privileges: Vec<AddressBookPrivilege>,
    },
    Err(Error),
}
