//! Infrastructure module - shared utilities and types
//! Security: MEDIUM - Foundation for all other modules

pub mod constants;
pub mod error_types;
pub mod math_utils;
pub mod types;

// Re-export commonly used items
pub use constants::*;
pub use error_types::{IcpxError, Result};
pub use math_utils::*;
pub use types::*;