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
#[allow(unused_imports)]
pub use users::*;
#[allow(unused_imports)]
pub use accounts::*;
#[allow(unused_imports)]
pub use assets::*;
#[allow(unused_imports)]
pub use permissions::*;
#[allow(unused_imports)]
pub use requests::*;
#[allow(unused_imports)]
pub use system::*;
#[allow(unused_imports)]
pub use external_canisters::*;