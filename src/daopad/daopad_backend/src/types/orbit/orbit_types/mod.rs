//! Orbit Station type definitions organized by domain
//!
//! This module breaks down the monolithic orbit.rs file into domain-specific
//! submodules for better maintainability and compile-time efficiency.

pub mod users;
pub mod accounts;
pub mod assets;
pub mod permissions;
pub mod requests;
pub mod system;
pub mod external_canisters;

// Re-export all types at module level for easy migration
pub use users::*;
pub use accounts::*;
pub use assets::*;
pub use permissions::*;
pub use requests::*;
pub use system::*;
pub use external_canisters::*;