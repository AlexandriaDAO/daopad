//! Stable storage management for upgrade persistence

use candid::{CandidType, Deserialize};
use std::collections::HashMap;
use crate::_1_CRITICAL_OPERATIONS::minting::mint_state::PendingMint;

#[derive(CandidType, Deserialize, Default)]
pub struct StableState {
    pub pending_mints: HashMap<String, PendingMint>,
}

pub fn save_state(pending_mints: HashMap<String, PendingMint>) {
    let state = StableState { pending_mints };
    ic_cdk::println!("💾 Saving {} pending mints to stable storage", state.pending_mints.len());
    ic_cdk::storage::stable_save((state,))
        .expect("Failed to save state to stable memory");
}

pub fn restore_state() -> HashMap<String, PendingMint> {
    match ic_cdk::storage::stable_restore::<(StableState,)>() {
        Ok((state,)) => {
            ic_cdk::println!("✅ Restored {} pending mints from stable storage", state.pending_mints.len());
            let now = ic_cdk::api::time();
            let cleaned: HashMap<_, _> = state.pending_mints.into_iter()
                .filter(|(id, mint)| {
                    let age = now.saturating_sub(mint.created_at);
                    let is_valid = age < 86_400_000_000_000; // 24 hours
                    if !is_valid {
                        ic_cdk::println!("Dropping expired mint {} from stable storage", id);
                    }
                    is_valid
                })
                .collect();
            cleaned
        }
        Err(e) => {
            ic_cdk::println!("⚠️  No stable state to restore (first deployment or empty): {}", e);
            HashMap::new()
        }
    }
}
