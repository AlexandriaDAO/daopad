//! Orbit Station type definitions
//!
//! This module re-exports all Orbit-related types from domain-specific submodules.
//! For new code, prefer importing from specific modules:
//! - `orbit_types::users` - User and group management
//! - `orbit_types::accounts` - Treasury accounts and balances
//! - `orbit_types::assets` - Asset definitions and operations
//! - `orbit_types::permissions` - Permissions and resources
//! - `orbit_types::requests` - Requests and operations
//! - `orbit_types::system` - System info and settings
//! - `orbit_types::external_canisters` - External canister management

pub mod orbit_types;

// Re-export everything for backward compatibility
// This allows existing code with `use crate::types::orbit::*` to keep working
pub use orbit_types::users::*;
pub use orbit_types::accounts::*;
pub use orbit_types::assets::*;
pub use orbit_types::permissions::*;
pub use orbit_types::requests::*;
pub use orbit_types::system::*;
pub use orbit_types::external_canisters::*;