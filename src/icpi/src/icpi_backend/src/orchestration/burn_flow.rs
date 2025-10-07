use candid::{Nat, Principal};

/// Orchestrate the complete burning flow
pub async fn orchestrate_burn(
    caller: Principal,
    icpi_amount: Nat,
) -> Result<Vec<(String, Nat)>, String> {
    // This orchestrates:
    // 1. Receive ICPI from user (auto-burn on receipt)
    // 2. Calculate proportional share of each token
    // 3. Transfer tokens back to user

    crate::critical_operations::burn_icpi(caller, icpi_amount).await
}