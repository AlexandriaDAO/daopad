use candid::{Nat, Principal};

/// Orchestrate the complete minting flow
pub async fn orchestrate_mint(
    caller: Principal,
    usdt_amount: Nat,
) -> Result<Nat, String> {
    // This orchestrates:
    // 1. Receive ckUSDT from user
    // 2. Mint proportional ICPI
    // 3. Hold ckUSDT for rebalancing

    crate::critical_operations::mint_icpi(caller, usdt_amount).await
}