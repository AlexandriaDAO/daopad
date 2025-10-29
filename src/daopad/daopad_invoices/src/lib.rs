use candid::{Nat, Principal};
use ic_cdk::{api::management_canister::http_request::TransformArgs, export_candid};
use std::collections::HashMap;
mod http;
mod queries;
mod storage;
mod stripe;
mod swap;
mod types;
mod webhook;
mod exchange_rate;

use types::{HttpRequest, HttpResponse, Invoice};

// Export Candid interface
export_candid!();
