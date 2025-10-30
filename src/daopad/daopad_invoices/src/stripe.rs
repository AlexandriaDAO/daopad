//1. IMPORT IC MANAGEMENT CANISTER
//This includes all methods and types needed
use ic_cdk::{
    api::{
        id,
        management_canister::{
            http_request::{
                http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse,
                TransformArgs, TransformContext, TransformFunc,
            },
            main::raw_rand,
        },
        time,
    },
    caller, println,
};
use candid::Principal;

use crate::storage::{add_invoice_for_principal, get_stripe_api_secret};
use crate::types::{Invoice, InvoiceStatus, Collateral};

// Generate a random 32-character idempotency key
async fn generate_idempotency_key() -> String {
    let random_bytes = raw_rand().await.unwrap();
    hex::encode(&random_bytes.0[0..16]) // 16 bytes = 32 hex chars
}

// Parse Orbit's ICRC1 address format
// Orbit returns: "account-text-with-checksum.subaccount-hex"
// Example: "6ulqe-qaaaa-aaaac-a4w3a-cai-s7lkucq.886ee66a28974c4c86c8a0bce7eb870600000000000000000000000000000000"
//
// The principal (account owner) comes from orbit_station_id parameter
// We only extract the subaccount hex from after the dot
fn parse_orbit_icrc1_address(address: &str, station_principal: Principal) -> Result<(Principal, Option<Vec<u8>>), String> {
    let parts: Vec<&str> = address.split('.').collect();

    // If no dot, assume it's a simple principal with no subaccount
    if parts.len() == 1 {
        // Try to parse as principal (for backward compatibility)
        let principal = Principal::from_text(parts[0])
            .unwrap_or(station_principal);
        return Ok((principal, None));
    }

    // Use the station_principal as the account owner
    // The text before the dot is ICRC1 account text representation (includes checksum)
    let principal = station_principal;

    // Parse subaccount hex string after the dot
    let subaccount_hex = parts[1];
    let subaccount_bytes = hex::decode(subaccount_hex)
        .map_err(|e| format!("Invalid subaccount hex: {}", e))?;

    // Validate length is exactly 32 bytes
    if subaccount_bytes.len() != 32 {
        return Err(format!(
            "Subaccount must be 32 bytes, got {}",
            subaccount_bytes.len()
        ));
    }

    Ok((principal, Some(subaccount_bytes)))
}

//Update method using the HTTPS outcalls feature
#[ic_cdk::update]
async fn create_invoice(
    amount_in_cents: u64,
    collateral_name: String,
    description: Option<String>,
    orbit_station_id: candid::Principal,
    orbit_account_id: String,
    orbit_account_address: String,
) -> String {
    // Check if caller is anonymous - reject anonymous users
    let caller = caller();
    if caller == candid::Principal::anonymous() {
        return "Error: Anonymous users cannot create invoices".to_string();
    }

    // Validate collateral parameter
    let collateral = match collateral_name.as_str() {
        "ICP" => Collateral::ICP,
        "ckUSDT" => Collateral::ckUSDT,
        _ => return "Error: Invalid collateral type. Must be 'ICP' or 'ckUSDT'".to_string(),
    };

    // Parse the ICRC1 address into principal + subaccount
    // Use orbit_station_id as the account owner (treasury accounts are owned by the station)
    let (treasury_owner, treasury_subaccount) = match parse_orbit_icrc1_address(&orbit_account_address, orbit_station_id) {
        Ok(parsed) => parsed,
        Err(e) => return format!("Error parsing ICRC1 address: {}", e),
    };

    // Process description (empty string if not provided)
    let invoice_description = description.unwrap_or_else(|| String::new());

    println!(
        "Creating invoice with collateral: {}, orbit_account_id: {}, treasury_owner: {}, has_subaccount: {}",
        collateral_name, orbit_account_id, treasury_owner.to_text(), treasury_subaccount.is_some()
    );

    // Generate random idempotency key
    let idempotency_key = generate_idempotency_key().await;
    println!("Generated idempotency key: {}", idempotency_key);

    let stripe_secret = get_stripe_api_secret();
    // 2.1 Setup the URL
    let url = "https://api.stripe.com/v1/payment_links";

    // 2.2 prepare headers for the system http_request call
    let request_headers = vec![
        HttpHeader {
            name: "Idempotency-Key".to_string(),
            value: idempotency_key.clone(),
        },
        HttpHeader {
            name: "Authorization".to_string(),
            value: format!("Bearer {}", stripe_secret),
        },
        HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/x-www-form-urlencoded".to_string(),
        },
    ];

    let params = [
        // Line item fields (flattened for form encoding)
        ("line_items[0][price_data][currency]", "usd".to_string()),
        (
            "line_items[0][price_data][product_data][name]",
            "Account Deposit".to_string(),
        ),
        (
            "line_items[0][price_data][unit_amount]",
            amount_in_cents.to_string(),
        ),
        ("line_items[0][quantity]", "1".to_string()),
        ("after_completion[type]", "redirect".to_string()),
        (
            "after_completion[redirect][url]",
            "https://daopad.org/?success".to_string(),
        ),
        // Make link single-use only
        ("restrictions[completed_sessions][limit]", "1".to_string()),
    ];

    let body_string = params
        .iter()
        .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    let request_body: Option<Vec<u8>> = Some(body_string.into_bytes());

    // Base request configuration
    let base_request = CanisterHttpRequestArgument {
        url: url.to_string(),
        max_response_bytes: Some(10000), // ~10KB to cover response + headers with buffer
        method: HttpMethod::POST,
        headers: request_headers.clone(),
        body: request_body.clone(),
        transform: None, // Will be overridden
    };

    // First request with transform
    let request_with_transform = CanisterHttpRequestArgument {
        transform: Some(TransformContext {
            function: TransformFunc::new(id(), "transform_first".to_string()),
            context: vec![],
        }),
        ..base_request.clone()
    };

    // Second request with different transform
    let request_with_second_transform = CanisterHttpRequestArgument {
        transform: Some(TransformContext {
            function: TransformFunc::new(id(), "transform_second".to_string()),
            context: vec![],
        }),
        ..base_request.clone()
    };

    //3. MAKE HTTPS REQUEST AND WAIT FOR RESPONSE

    //Note: in Rust, `http_request()` already sends the cycles needed
    //so no need for explicit Cycles.add() as in Motoko
    match http_request(request_with_transform, 160_000_000u128).await {
        //4. DECODE AND RETURN THE RESPONSE

        //See: https://docs.rs/ic-cdk/latest/ic_cdk/management_canister/struct.HttpRequestResult.html
        Ok(_response) => {
            println!("First request (with transform) succeeded");

            // Second request with second transform to get actual response
            match http_request(request_with_second_transform, 160_000_000u128).await {
                Ok(actual_response) => {
                    println!("Second request (with transform) succeeded");
                    //We need to decode that Vec<u8> that is the body into readable text.
                    //To do this, we:
                    //  1. Call `String::from_utf8()` on response.body
                    let str_body = String::from_utf8(actual_response.0.body)
                        .expect("Response is not UTF-8 encoded.");
                    println!("Full response: {:?}", str_body);

                    // Extract URL and ID from Stripe payment link response
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&str_body) {
                        if let Some(url) = json.get("url").and_then(|u| u.as_str()) {
                            if let Some(payment_link_id) = json.get("id").and_then(|id| id.as_str())
                            {
                                println!("Extracted URL: {}, ID: {}", url, payment_link_id);

                                // Create invoice for this payment link
                                let invoice = Invoice {
                                    id: payment_link_id.to_string(),
                                    url: url.to_string(),
                                    fiat: amount_in_cents,
                                    crypto: 0, // Initially set to 0, will be updated later
                                    collateral: collateral,
                                    description: invoice_description,
                                    created_at: time(),
                                    status: InvoiceStatus::Unpaid,
                                    orbit_account_id: orbit_account_id.clone(),
                                    treasury_owner,
                                    treasury_subaccount,
                                };

                                add_invoice_for_principal(caller, invoice);
                                println!("Created invoice for payment link: {}", payment_link_id);

                                url.to_string()
                            } else {
                                println!("No ID found in payment link response");
                                "Error: No ID found in payment link response".to_string()
                            }
                        } else {
                            println!("No URL found in response");
                            "Error: No URL found in payment link response".to_string()
                        }
                    } else {
                        println!("Failed to parse JSON response");
                        "Error: Failed to parse payment link response".to_string()
                    }
                }
                Err(error) => {
                    println!("Second request failed: {:?}", error);
                    format!("Second request failed: {:?}", error)
                }
            }
        }
        Err(error) => {
            println!("First Request failed: {:?}", error);
            //Return the error as a string and end the method
            format!("First request failed: {:?}", error)
        }
    }
}

#[ic_cdk::query]
fn transform_first(_raw: TransformArgs) -> HttpResponse {
    // Normalize ALL responses to identical format for consensus
    // Return empty body as requested
    HttpResponse {
        status: 200u8.into(),
        body: vec![], // Empty body
        headers: vec![],
        ..Default::default()
    }
}

// Second transform function - returns actual status and body
#[ic_cdk::query]
fn transform_second(raw: TransformArgs) -> HttpResponse {
    HttpResponse {
        status: raw.response.status, // Keep actual status
        body: raw.response.body,     // Return actual body
        headers: vec![],             // Empty headers
        ..Default::default()
    }
}
