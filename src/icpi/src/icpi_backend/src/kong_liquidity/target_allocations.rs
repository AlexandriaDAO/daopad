use crate::types::rebalancing::TargetAllocation;
use crate::types::tokens::TrackedToken;
use crate::infrastructure::cache::{get_cached, CachePolicy};

/// Calculate target allocations based on locked TVL
/// Cached for 1 hour as targets don't change frequently
pub async fn calculate_target_allocations() -> Result<Vec<TargetAllocation>, String> {
    get_cached(
        "target_allocations",
        CachePolicy::Long,
        || calculate_targets_uncached()
    )
}

/// Calculate target allocations without caching
async fn calculate_targets_uncached() -> Result<Vec<TargetAllocation>, String> {
    let tvl_data = super::calculate_locked_tvl().await?;

    // Calculate total TVL for tracked tokens only (excluding ckUSDT)
    let total_tvl: f64 = tvl_data.iter()
        .filter(|t| t.token != TrackedToken::ckUSDT)
        .map(|t| t.total_locked_usd)
        .sum();

    if total_tvl == 0.0 {
        // No locked liquidity, return equal weights
        return Ok(equal_weight_allocations());
    }

    let mut allocations = Vec::new();

    for tvl in tvl_data {
        // Skip ckUSDT as it's the reserve currency
        if tvl.token == TrackedToken::ckUSDT {
            continue;
        }

        let target_percentage = if total_tvl > 0.0 {
            (tvl.total_locked_usd / total_tvl) * 100.0
        } else {
            25.0 // Equal weight fallback
        };

        allocations.push(TargetAllocation {
            token: tvl.token,
            target_percentage,
            target_usd_value: tvl.total_locked_usd,
        });
    }

    // Ensure percentages sum to 100%
    normalize_allocations(&mut allocations);

    Ok(allocations)
}

/// Return equal weight allocations as fallback
fn equal_weight_allocations() -> Vec<TargetAllocation> {
    let tokens = TrackedToken::all();
    let weight = 100.0 / tokens.len() as f64;

    tokens.iter().map(|token| {
        TargetAllocation {
            token: token.clone(),
            target_percentage: weight,
            target_usd_value: 0.0,
        }
    }).collect()
}

/// Normalize allocations to ensure they sum to 100%
fn normalize_allocations(allocations: &mut Vec<TargetAllocation>) {
    let total_pct: f64 = allocations.iter().map(|a| a.target_percentage).sum();

    if total_pct > 0.0 && (total_pct - 100.0).abs() > 0.01 {
        let scale = 100.0 / total_pct;
        for allocation in allocations.iter_mut() {
            allocation.target_percentage *= scale;
        }
    }
}

/// Get target allocation for a specific token
pub async fn get_token_target(token: &TrackedToken) -> Result<f64, String> {
    let allocations = calculate_target_allocations().await?;

    allocations.iter()
        .find(|a| a.token == *token)
        .map(|a| a.target_percentage)
        .ok_or_else(|| format!("No target allocation for {}", token.to_symbol()))
}