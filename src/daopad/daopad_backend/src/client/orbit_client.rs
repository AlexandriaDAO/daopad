/// OrbitClient - Centralized client for all Orbit Station cross-canister calls
///
/// This module consolidates 47 scattered ic_cdk::call patterns into a single,
/// consistent interface with unified error handling.
///
/// Key benefits:
/// - Consistent error messages across all Orbit calls
/// - Single location for retry logic, caching, and metrics (future)
/// - Easier testing (mock one client instead of ic_cdk 47 times)
/// - Type-safe response handling via OrbitResponse trait

use candid::{CandidType, Principal};
use ic_cdk::api::call::RejectionCode;
use serde::de::DeserializeOwned;

use crate::types::orbit_types::system::{
    Error, SystemInfo, SystemInfoMinimal, SystemInfoResultMinimal,
    OrbitAddressBookEntry, ListAddressBookResult,
};
use crate::types::orbit_types::users::{UserDTO, ListUsersResult};
use crate::types::orbit_types::accounts::{
    Account, AccountMinimal, AccountCallerPrivileges, AccountBalance,
    ListAccountsResult, ListAccountsResultMinimal, FetchAccountBalancesResult,
};
use crate::types::orbit_types::requests::{
    CreateRequestResult, CreateRequestResponse,
};

/// Centralized client for all Orbit Station cross-canister calls
pub struct OrbitClient;

impl OrbitClient {
    /// Generic method for any Orbit call with standard Ok/Err response pattern
    ///
    /// This handles the common Orbit response pattern where the outer Result is from ic_cdk::call,
    /// and the inner Response enum has Ok/Err variants.
    ///
    /// # Type Parameters
    /// - `Input`: The input type for the Orbit method (must be CandidType)
    /// - `Response`: The response type that implements OrbitResponse (e.g., ListUsersResult)
    /// - `Data`: The actual data type extracted from the Ok variant
    ///
    /// # Example
    /// ```ignore
    /// let users = OrbitClient::call::<_, ListUsersResult, Vec<UserDTO>>(
    ///     station_id,
    ///     "list_users",
    ///     input,
    /// ).await?;
    /// ```
    pub async fn call<Input, Response, Data>(
        station_id: Principal,
        method: &str,
        input: Input,
    ) -> Result<Data, String>
    where
        Input: CandidType,
        Response: CandidType + DeserializeOwned + OrbitResponse<Data>,
    {
        let result: Result<(Response,), (RejectionCode, String)> =
            ic_cdk::call(station_id, method, (input,)).await;

        match result {
            Ok((response,)) => response.into_result(),
            Err((code, msg)) => {
                Err(format!("Orbit call '{}' failed: code={:?}, msg={}", method, code, msg))
            }
        }
    }

    /// Specialized method for calls that return raw data (no Ok/Err wrapper)
    ///
    /// Some Orbit methods return data directly without the standard Ok/Err enum wrapper.
    /// Use this method for those cases.
    ///
    /// # Example
    /// ```ignore
    /// let data = OrbitClient::call_raw::<_, SomeData>(
    ///     station_id,
    ///     "get_something",
    ///     input,
    /// ).await?;
    /// ```
    pub async fn call_raw<Input, Output>(
        station_id: Principal,
        method: &str,
        input: Input,
    ) -> Result<Output, String>
    where
        Input: CandidType,
        Output: CandidType + DeserializeOwned,
    {
        let result: Result<(Output,), (RejectionCode, String)> =
            ic_cdk::call(station_id, method, (input,)).await;

        match result {
            Ok((output,)) => Ok(output),
            Err((code, msg)) => {
                Err(format!("Orbit call '{}' failed: code={:?}, msg={}", method, code, msg))
            }
        }
    }
}

/// Trait for Orbit responses that follow the standard Ok/Err pattern
///
/// Orbit Station responses typically follow this pattern:
/// ```ignore
/// enum SomeResult {
///     Ok { data_field: T, ... },
///     Err(Error),
/// }
/// ```
///
/// Implement this trait for each Orbit response type to enable automatic
/// error handling via OrbitClient::call.
pub trait OrbitResponse<T> {
    /// Extract the result data or convert the error to a String
    fn into_result(self) -> Result<T, String>;
}

// ============================================================================
// Trait Implementations for Orbit Response Types
// ============================================================================

/// ListUsersResult: Extracts Vec<UserDTO> from the Ok variant
impl OrbitResponse<Vec<UserDTO>> for ListUsersResult {
    fn into_result(self) -> Result<Vec<UserDTO>, String> {
        match self {
            ListUsersResult::Ok { users, .. } => Ok(users),
            ListUsersResult::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

/// ListAccountsResult: Extracts Vec<Account> from the Ok variant
impl OrbitResponse<Vec<Account>> for ListAccountsResult {
    fn into_result(self) -> Result<Vec<Account>, String> {
        match self {
            ListAccountsResult::Ok { accounts, .. } => Ok(accounts),
            ListAccountsResult::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

/// ListAccountsResult: Alternative implementation to extract full response with privileges
impl OrbitResponse<(Vec<Account>, Vec<AccountCallerPrivileges>)> for ListAccountsResult {
    fn into_result(self) -> Result<(Vec<Account>, Vec<AccountCallerPrivileges>), String> {
        match self {
            ListAccountsResult::Ok { accounts, privileges, .. } => Ok((accounts, privileges)),
            ListAccountsResult::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

/// FetchAccountBalancesResult: Extracts Vec<Option<AccountBalance>> from the Ok variant
impl OrbitResponse<Vec<Option<AccountBalance>>> for FetchAccountBalancesResult {
    fn into_result(self) -> Result<Vec<Option<AccountBalance>>, String> {
        match self {
            FetchAccountBalancesResult::Ok { balances } => Ok(balances),
            FetchAccountBalancesResult::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

/// CreateRequestResult: Extracts CreateRequestResponse from the Ok variant
impl OrbitResponse<CreateRequestResponse> for CreateRequestResult {
    fn into_result(self) -> Result<CreateRequestResponse, String> {
        match self {
            CreateRequestResult::Ok(response) => Ok(response),
            CreateRequestResult::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

/// SystemInfoResultMinimal: Extracts SystemInfoMinimal from the Ok variant
impl OrbitResponse<SystemInfoMinimal> for SystemInfoResultMinimal {
    fn into_result(self) -> Result<SystemInfoMinimal, String> {
        match self {
            SystemInfoResultMinimal::Ok { system } => Ok(system),
            SystemInfoResultMinimal::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

/// ListAccountsResultMinimal: Extracts Vec<AccountMinimal> from the Ok variant
impl OrbitResponse<Vec<AccountMinimal>> for ListAccountsResultMinimal {
    fn into_result(self) -> Result<Vec<AccountMinimal>, String> {
        match self {
            ListAccountsResultMinimal::Ok { accounts, .. } => Ok(accounts),
            ListAccountsResultMinimal::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

/// ListAccountsResultMinimal: Alternative implementation to extract full response with privileges
impl OrbitResponse<(Vec<AccountMinimal>, Vec<AccountCallerPrivileges>)> for ListAccountsResultMinimal {
    fn into_result(self) -> Result<(Vec<AccountMinimal>, Vec<AccountCallerPrivileges>), String> {
        match self {
            ListAccountsResultMinimal::Ok { accounts, privileges, .. } => Ok((accounts, privileges)),
            ListAccountsResultMinimal::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

/// ListAddressBookResult: Extracts Vec<OrbitAddressBookEntry> from the Ok variant
impl OrbitResponse<Vec<OrbitAddressBookEntry>> for ListAddressBookResult {
    fn into_result(self) -> Result<Vec<OrbitAddressBookEntry>, String> {
        match self {
            ListAddressBookResult::Ok { address_book_entries, .. } => Ok(address_book_entries),
            ListAddressBookResult::Err(e) => Err(format!("Orbit error: {}", e)),
        }
    }
}

// ============================================================================
// Convenience Methods for Common Operations
// ============================================================================

impl OrbitClient {
    /// List users with consistent error handling
    ///
    /// # Example
    /// ```ignore
    /// let users = OrbitClient::list_users(station_id, input).await?;
    /// ```
    pub async fn list_users(
        station_id: Principal,
        input: impl CandidType,
    ) -> Result<Vec<UserDTO>, String> {
        Self::call::<_, ListUsersResult, _>(station_id, "list_users", input).await
    }

    /// List accounts with consistent error handling
    ///
    /// # Example
    /// ```ignore
    /// let accounts = OrbitClient::list_accounts(station_id, input).await?;
    /// ```
    pub async fn list_accounts(
        station_id: Principal,
        input: impl CandidType,
    ) -> Result<Vec<Account>, String> {
        Self::call::<_, ListAccountsResult, _>(station_id, "list_accounts", input).await
    }

    /// Fetch account balances with consistent error handling
    ///
    /// # Example
    /// ```ignore
    /// let balances = OrbitClient::fetch_account_balances(station_id, input).await?;
    /// ```
    pub async fn fetch_account_balances(
        station_id: Principal,
        input: impl CandidType,
    ) -> Result<Vec<Option<AccountBalance>>, String> {
        Self::call::<_, FetchAccountBalancesResult, _>(
            station_id,
            "fetch_account_balances",
            input,
        ).await
    }

    /// Create a request in Orbit Station with consistent error handling
    ///
    /// # Example
    /// ```ignore
    /// let response = OrbitClient::create_request(station_id, input).await?;
    /// let request_id = response.request.id;
    /// ```
    pub async fn create_request(
        station_id: Principal,
        input: impl CandidType,
    ) -> Result<CreateRequestResponse, String> {
        Self::call::<_, CreateRequestResult, _>(station_id, "create_request", input).await
    }
}
