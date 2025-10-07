//! Infrastructure module - Phase 4 complete
//! Contains errors, math, constants, and types

pub mod errors;
pub mod math;
pub mod constants;
// types module TBD - using root types module for now

// Re-export commonly used items
pub use errors::{IcpiError, Result, MintError, BurnError, RebalanceError};
pub use math::{multiply_and_divide, convert_decimals, calculate_mint_amount, calculate_redemptions};
pub use constants::*;

