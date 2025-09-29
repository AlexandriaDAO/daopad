use crate::kong_locker::get_all_lock_canisters;
use crate::kongswap::get_lp_positions;
use crate::types::{TrackedToken, LPBalancesReply, decimal_to_f64, f64_to_decimal};
use rust_decimal::Decimal;
use std::collections::HashMap;
use std::str::FromStr;

// Calculate total locked TVL for tracked tokens
pub async fn calculate_locked_tvl() -> Result<HashMap<TrackedToken, Decimal>, String> {
    let lock_canisters = get_all_lock_canisters().await?;
    let mut tvl_by_token: HashMap<TrackedToken, Decimal> = HashMap::new();

    // Initialize tracked tokens with zero
    tvl_by_token.insert(TrackedToken::ALEX, Decimal::ZERO);
    tvl_by_token.insert(TrackedToken::ZERO, Decimal::ZERO);
    tvl_by_token.insert(TrackedToken::KONG, Decimal::ZERO);
    tvl_by_token.insert(TrackedToken::BOB, Decimal::ZERO);

    ic_cdk::println!("Processing {} lock canisters for TVL calculation", lock_canisters.len());

    let mut processed = 0;
    let mut errors = 0;

    // Process each lock canister sequentially (Principle 2)
    for (_user, lock_canister) in lock_canisters.iter() {
        match get_lp_positions(*lock_canister).await {
            Ok(positions) => {
                for lp in positions {
                    process_lp_position(&lp, &mut tvl_by_token)?;
                }
                processed += 1;
            },
            Err(e) => {
                // Log error but continue processing other canisters
                ic_cdk::println!("Error querying {}: {}", lock_canister, e);
                errors += 1;
            }
        }
    }

    ic_cdk::println!("TVL calculation complete. Processed: {}, Errors: {}", processed, errors);

    // Log results
    for (token, tvl) in tvl_by_token.iter() {
        ic_cdk::println!("{:?} TVL: ${}", token, tvl);
    }

    Ok(tvl_by_token)
}

// Process a single LP position and update TVL
fn process_lp_position(
    lp: &LPBalancesReply,
    tvl_by_token: &mut HashMap<TrackedToken, Decimal>
) -> Result<(), String> {
    // For 50/50 pools, attribute half value to each token
    let half_value = Decimal::from_str(&lp.usd_balance.to_string())
        .map_err(|e| format!("Decimal conversion error: {}", e))?
        .checked_div(Decimal::from(2))
        .ok_or("Division error")?;

    // Check each tracked token in both positions
    update_token_tvl(&lp.symbol_0, half_value, tvl_by_token);
    update_token_tvl(&lp.symbol_1, half_value, tvl_by_token);

    Ok(())
}

// Update TVL for a specific token symbol
fn update_token_tvl(
    symbol: &str,
    value: Decimal,
    tvl_by_token: &mut HashMap<TrackedToken, Decimal>
) {
    match symbol {
        "ALEX" => {
            *tvl_by_token.get_mut(&TrackedToken::ALEX).unwrap() += value;
        },
        "ZERO" => {
            *tvl_by_token.get_mut(&TrackedToken::ZERO).unwrap() += value;
        },
        "KONG" => {
            *tvl_by_token.get_mut(&TrackedToken::KONG).unwrap() += value;
        },
        "BOB" => {
            *tvl_by_token.get_mut(&TrackedToken::BOB).unwrap() += value;
        },
        _ => {
            // Not a tracked token, ignore
        }
    }
}

// Calculate TVL percentages for each tracked token
pub fn calculate_tvl_percentages(
    tvl_by_token: &HashMap<TrackedToken, Decimal>
) -> Result<HashMap<TrackedToken, Decimal>, String> {
    let total_tvl: Decimal = tvl_by_token.values()
        .fold(Decimal::ZERO, |acc, val| acc + val);

    if total_tvl == Decimal::ZERO {
        return Err("No locked liquidity found for tracked tokens".to_string());
    }

    let mut percentages = HashMap::new();

    for (token, tvl) in tvl_by_token.iter() {
        let percentage = (*tvl / total_tvl) * Decimal::from(100);
        percentages.insert(token.clone(), percentage);
    }

    Ok(percentages)
}

// Get TVL summary with formatted output
pub async fn get_tvl_summary() -> Result<TVLSummary, String> {
    let tvl_by_token = calculate_locked_tvl().await?;
    let percentages = calculate_tvl_percentages(&tvl_by_token)?;

    let total_tvl = tvl_by_token.values()
        .fold(Decimal::ZERO, |acc, val| acc + val);

    let mut token_summaries = Vec::new();

    for token in [TrackedToken::ALEX, TrackedToken::ZERO, TrackedToken::KONG, TrackedToken::BOB] {
        let tvl = tvl_by_token.get(&token).unwrap_or(&Decimal::ZERO);
        let percentage = percentages.get(&token).unwrap_or(&Decimal::ZERO);

        token_summaries.push(TokenTVLSummary {
            token: token.clone(),
            tvl_usd: decimal_to_f64(*tvl),
            percentage: decimal_to_f64(*percentage),
        });
    }

    // Sort by TVL descending
    token_summaries.sort_by(|a, b| b.tvl_usd.partial_cmp(&a.tvl_usd).unwrap());

    Ok(TVLSummary {
        total_tvl_usd: decimal_to_f64(total_tvl),
        tokens: token_summaries,
        timestamp: ic_cdk::api::time(),
    })
}

// Helper types for TVL summary
#[derive(candid::CandidType, candid::Deserialize, serde::Serialize, Debug)]
pub struct TokenTVLSummary {
    pub token: TrackedToken,
    pub tvl_usd: f64,
    pub percentage: f64,
}

#[derive(candid::CandidType, candid::Deserialize, serde::Serialize, Debug)]
pub struct TVLSummary {
    pub total_tvl_usd: f64,
    pub tokens: Vec<TokenTVLSummary>,
    pub timestamp: u64,
}

// Cache TVL data for performance
use std::cell::RefCell;

thread_local! {
    static TVL_CACHE: RefCell<Option<CachedTVL>> = RefCell::new(None);
}

struct CachedTVL {
    tvl_by_token: HashMap<TrackedToken, Decimal>,
    last_updated: u64,
    ttl_seconds: u64,
}

pub async fn get_cached_or_calculate_tvl() -> Result<HashMap<TrackedToken, Decimal>, String> {
    let now = ic_cdk::api::time() / 1_000_000_000;

    // Check cache
    let cached = TVL_CACHE.with(|cache| {
        cache.borrow().as_ref().and_then(|c| {
            if now - c.last_updated < c.ttl_seconds {
                Some(c.tvl_by_token.clone())
            } else {
                None
            }
        })
    });

    if let Some(tvl) = cached {
        ic_cdk::println!("Using cached TVL data");
        return Ok(tvl);
    }

    // Calculate fresh
    let tvl = calculate_locked_tvl().await?;

    // Update cache
    TVL_CACHE.with(|cache| {
        *cache.borrow_mut() = Some(CachedTVL {
            tvl_by_token: tvl.clone(),
            last_updated: now,
            ttl_seconds: 300, // 5 minute TTL for TVL
        });
    });

    Ok(tvl)
}