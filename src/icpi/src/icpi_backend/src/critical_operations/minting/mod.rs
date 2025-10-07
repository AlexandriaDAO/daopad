use crate::infrastructure::logging::AuditLogger;
use crate::infrastructure::cache::assert_no_cache_for_critical_op;
use crate::portfolio_data::get_index_state_uncached;
use crate::types::tokens::{ICPI_CANISTER_ID, TrackedToken};
use candid::{Nat, Principal};

/// CRITICAL: Mint new ICPI tokens
/// This function MUST use uncached data and be atomic
pub async fn mint_icpi(
    user: Principal,
    usdt_amount: Nat
) -> Result<Nat, String> {
    // Security validations
    super::validate_principal(&user)?;
    super::validate_amount(&usdt_amount, 100_000, 100_000_000_000)?; // Min $0.10, Max $100k
    super::check_rate_limit("mint_icpi", 1_000_000_000)?; // 1 second rate limit
    super::assert_atomic_operation("mint_icpi");

    // NO CACHING - Get fresh state
    assert_no_cache_for_critical_op("mint_icpi");
    let state_before = get_index_state_uncached().await?;

    // Calculate ICPI to mint
    let icpi_supply = crate::portfolio_data::get_icpi_supply().await?;
    let tvl_before = state_before.total_value;

    let icpi_to_mint = if icpi_supply == 0u64 {
        // Initial mint: 1 ICPI = 1 USDT
        usdt_amount.clone()
    } else {
        // Proportional mint
        calculate_proportional_mint(&usdt_amount, &icpi_supply, tvl_before)?
    };

    // Execute mint on ICPI ledger
    let icpi_canister = Principal::from_text(ICPI_CANISTER_ID)
        .map_err(|e| format!("Invalid ICPI principal: {}", e))?;

    let mint_result: Result<(Nat,), _> = ic_cdk::call(
        icpi_canister,
        "icrc1_mint",
        (
            crate::types::icrc::Account {
                owner: user,
                subaccount: None,
            },
            icpi_to_mint.clone(),
        ),
    ).await;

    match mint_result {
        Ok((block_index,)) => {
            // Log for audit
            AuditLogger::log_mint(
                user,
                usdt_amount.0.to_u64().unwrap_or(0),
                icpi_to_mint.0.to_u64().unwrap_or(0),
                (tvl_before * 1e6) as u64,
                ((tvl_before + usdt_amount.0.to_u64().unwrap_or(0) as f64 / 1e6) * 1e6) as u64,
            );

            super::complete_atomic_operation("mint_icpi", true);
            Ok(icpi_to_mint)
        }
        Err(e) => {
            super::complete_atomic_operation("mint_icpi", false);
            Err(format!("Mint failed: {:?}", e))
        }
    }
}

fn calculate_proportional_mint(
    usdt_amount: &Nat,
    supply: &Nat,
    tvl: f64
) -> Result<Nat, String> {
    // new_icpi = (usdt_amount * current_supply) / current_tvl
    let usdt_value = usdt_amount.0.to_u64().ok_or("USDT amount overflow")? as f64 / 1e6;

    if tvl <= 0.0 {
        return Err("Invalid TVL for proportional minting".to_string());
    }

    let supply_f64 = supply.0.to_u64().ok_or("Supply overflow")? as f64;
    let new_tokens = (usdt_value * supply_f64) / tvl;

    Ok(Nat::from(new_tokens as u64))
}