use candid::{CandidType, Deserialize};
use ic_cdk::{query, update};
use serde::Serialize;

// Type definitions matching the candid interface

pub type UUID = String; // Format: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct MetadataItem {
    pub key: String,    // Max 100 characters
    pub value: String,  // Max 2000 characters
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddressBookEntry {
    pub id: UUID,
    pub address_owner: String,           // 1-255 characters
    pub address: String,                  // 1-255 characters
    pub address_format: String,          // One of 5 exact formats
    pub blockchain: String,              // "icp", "eth", or "btc" ONLY
    pub labels: Vec<String>,             // Max 10 labels, 150 chars each
    pub metadata: Vec<MetadataItem>,
    pub last_modification_timestamp: String, // RFC3339 format timestamp
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddressBookEntryCallerPrivileges {
    pub id: UUID,
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ListAddressBookEntriesInput {
    pub ids: Option<Vec<UUID>>,
    pub addresses: Option<Vec<String>>,
    pub blockchain: Option<String>,
    pub labels: Option<Vec<String>>,
    pub paginate: Option<crate::types::PaginationInput>,
    pub address_formats: Option<Vec<String>>,
    pub search_term: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ListAddressBookEntriesResponse {
    pub address_book_entries: Vec<AddressBookEntry>,
    pub privileges: Vec<AddressBookEntryCallerPrivileges>,
    pub total: u64,
    pub next_offset: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetAddressBookEntryInput {
    pub address_book_entry_id: UUID,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum GetAddressBookEntryResult {
    Ok {
        address_book_entry: AddressBookEntry,
        privileges: AddressBookEntryCallerPrivileges,
    },
    Err(crate::types::Error),
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum ListAddressBookEntriesResult {
    Ok(ListAddressBookEntriesResponse),
    Err(crate::types::Error),
}

// Request creation types
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreateRequestInput {
    pub operation: RequestOperationInput,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub execution_plan: Option<RequestExecutionPlan>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RequestExecutionPlan {
    Immediate,
    Scheduled { execution_time: String },
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RequestOperationInput {
    AddAddressBookEntry(AddAddressBookEntryOperationInput),
    EditAddressBookEntry(EditAddressBookEntryOperationInput),
    RemoveAddressBookEntry(RemoveAddressBookEntryOperationInput),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddAddressBookEntryOperationInput {
    pub address_owner: String,
    pub address: String,
    pub address_format: String,
    pub blockchain: String,
    pub metadata: Vec<MetadataItem>,
    pub labels: Vec<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EditAddressBookEntryOperationInput {
    pub address_book_entry_id: UUID,
    pub address_owner: Option<String>,
    pub labels: Option<Vec<String>>,
    pub change_metadata: Option<ChangeMetadata>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ChangeMetadata {
    ReplaceAllBy(Vec<MetadataItem>),
    OverrideSpecifiedBy(Vec<MetadataItem>),
    RemoveKeys(Vec<String>),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RemoveAddressBookEntryOperationInput {
    pub address_book_entry_id: UUID,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddressBookRequest {
    pub id: String,
    pub title: String,
    pub status: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum CreateRequestResult {
    Ok { request: AddressBookRequest },
    Err(crate::types::Error),
}

// Implementation of address book methods

#[query]
async fn get_address_book_entry(_input: GetAddressBookEntryInput) -> GetAddressBookEntryResult {
    // For now, we'll proxy this to Orbit Station
    // In a real implementation, we'd check if we have an Orbit station configured

    // Get the default orbit station (we'll use the first one for now)
    let stations = crate::api::orbit::list_all_orbit_stations();
    if stations.is_empty() {
        return GetAddressBookEntryResult::Err(crate::types::Error {
            code: "NO_ORBIT_STATION".to_string(),
            message: Some("No Orbit Station configured".to_string()),
            details: None,
        });
    }

    let _station_id = stations[0].1;

    // For the MVP, we return a mock entry
    // In production, this would query Orbit Station
    GetAddressBookEntryResult::Err(crate::types::Error {
        code: "NOT_IMPLEMENTED".to_string(),
        message: Some("Address book entry retrieval not yet implemented".to_string()),
        details: None,
    })
}

#[query]
async fn list_address_book_entries(_input: ListAddressBookEntriesInput) -> ListAddressBookEntriesResult {
    // For now, return an empty list
    // In a real implementation, we'd query Orbit Station for address book entries

    let stations = crate::api::orbit::list_all_orbit_stations();
    if stations.is_empty() {
        return ListAddressBookEntriesResult::Ok(ListAddressBookEntriesResponse {
            address_book_entries: vec![],
            privileges: vec![],
            total: 0,
            next_offset: None,
        });
    }

    // For MVP, return empty list
    ListAddressBookEntriesResult::Ok(ListAddressBookEntriesResponse {
        address_book_entries: vec![],
        privileges: vec![],
        total: 0,
        next_offset: None,
    })
}

#[update]
async fn create_address_book_request(input: CreateRequestInput) -> CreateRequestResult {
    // Get the first configured orbit station
    let stations = crate::api::orbit::list_all_orbit_stations();
    if stations.is_empty() {
        return CreateRequestResult::Err(crate::types::Error {
            code: "NO_ORBIT_STATION".to_string(),
            message: Some("No Orbit Station configured".to_string()),
            details: None,
        });
    }

    let _station_id = stations[0].1;

    // Convert our request operation to Orbit's format
    // For now, we'll return a mock response
    // In production, this would create a request in Orbit Station

    let request_title = input.title.unwrap_or_else(|| match &input.operation {
        RequestOperationInput::AddAddressBookEntry(op) => {
            format!("Add address book entry: {}", op.address_owner)
        }
        RequestOperationInput::EditAddressBookEntry(_) => {
            "Edit address book entry".to_string()
        }
        RequestOperationInput::RemoveAddressBookEntry(_) => {
            "Remove address book entry".to_string()
        }
    });

    // Return a mock successful response
    CreateRequestResult::Ok {
        request: AddressBookRequest {
            id: "mock-request-id".to_string(),
            title: request_title,
            status: "Created".to_string(),
        }
    }
}