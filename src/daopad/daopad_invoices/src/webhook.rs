use crate::http::{
    create_error_response, create_success_response, handle_get_info, handle_method_not_allowed,
    handle_preflight, handle_upgrade_to_update, parse_json_body,
};
use crate::storage::{find_invoice_by_payment_id, update_invoice_status_by_payment_id};
use crate::swap::process_payment;
use crate::types::{HttpRequest, HttpResponse, InvoiceStatus};
use ic_cdk::{println, query, update};
use serde_json::Value;

// =============================================================================
// HTTP GATEWAY HANDLERS
// =============================================================================

#[query]
fn http_request(request: HttpRequest) -> HttpResponse {
    println!(
        "Request received: {} {}",
        request.method, request.url
    );

    match request.method.as_str() {
        "OPTIONS" => handle_preflight(),
        "GET" => handle_get_request(&request),
        "POST" => handle_upgrade_to_update(),
        _ => handle_method_not_allowed(&request.method, "GET, POST, OPTIONS"),
    }
}

#[update]
async fn http_request_update(request: HttpRequest) -> HttpResponse {
    println!("POST request received: {}", request.url);
    println!("Headers: {:?}", request.headers);

    match request.method.as_str() {
        "POST" => handle_post_request(&request).await,
        _ => handle_method_not_allowed(&request.method, "POST"),
    }
}

// =============================================================================
// PRIVATE HELPER FUNCTIONS
// =============================================================================

fn handle_get_request(request: &HttpRequest) -> HttpResponse {
    // Parse URL path for routing
    let url_parts: Vec<&str> = request.url.split('?').collect();
    let path = url_parts[0];

    match path {
        "/" => handle_get_info(),
        "/health" => create_success_response("Service is healthy", None),
        _ => create_error_response(404, "Endpoint not found", Some("NOT_FOUND")),
    }
}

async fn handle_post_request(request: &HttpRequest) -> HttpResponse {
    // Parse URL path for webhook routing
    let url_parts: Vec<&str> = request.url.split('?').collect();
    let path = url_parts[0];

    match path {
        "/stripe-webhook" => handle_stripe_webhook(request).await,
        "/" => {
            // Default behavior for generic POST requests
            match parse_json_body(request) {
                Ok(json_value) => create_success_response(
                    "JSON data received and logged to console successfully",
                    Some(serde_json::json!({
                        "received_data": json_value,
                    })),
                ),
                Err(error_msg) => create_error_response(400, &error_msg, Some("INVALID_JSON")),
            }
        }
        _ => create_error_response(404, "Webhook endpoint not found", Some("NOT_FOUND")),
    }
}

async fn handle_stripe_webhook(request: &HttpRequest) -> HttpResponse {
    println!("Stripe webhook received");

    match parse_json_body(request) {
        Ok(webhook_data) => {
            println!("Webhook data: {:#}", webhook_data);

            // Get the event type
            let event_type = webhook_data["type"].as_str().unwrap_or("");
            println!("Stripe event type: {}", event_type);

            match event_type {
                "checkout.session.completed" => {
                    handle_checkout_session_completed(&webhook_data).await
                }
                _ => {
                    println!("Unhandled webhook event type: {}", event_type);
                    create_success_response("Webhook received but not processed", None)
                }
            }
        }
        Err(error_msg) => {
            println!("Failed to parse webhook JSON: {}", error_msg);
            create_error_response(400, &error_msg, Some("INVALID_WEBHOOK_JSON"))
        }
    }
}

async fn handle_checkout_session_completed(webhook_data: &Value) -> HttpResponse {
    println!("Processing checkout.session.completed event");

    let data = &webhook_data["data"]["object"];
    let amount_total = data["amount_total"].as_u64().unwrap_or(0);
    let payment_status = data["payment_status"].as_str().unwrap_or("");
    let payment_link_id = data["payment_link"].as_str().unwrap_or("");

    println!(
        "Amount: {} cents, Payment Link: {}, Status: {}",
        amount_total, payment_link_id, payment_status
    );

    if payment_status == "paid" && !payment_link_id.is_empty() {
        // Find the invoice by payment link ID to get the user principal
        match find_invoice_by_payment_id(payment_link_id) {
            Some((user_principal, invoice)) => {
                println!(
                    "Processing payment of {} cents for user: {} with collateral: {:?}",
                    amount_total,
                    user_principal.to_text(),
                    invoice.collateral
                );

                // Validate that Stripe webhook amount matches our stored invoice amount
                if amount_total != invoice.fiat {
                    println!(
                        "Amount mismatch! Stripe: {} cents, Invoice: {} cents", 
                        amount_total, invoice.fiat
                    );
                    return create_error_response(
                        400,
                        "Payment amount does not match invoice amount",
                        Some("AMOUNT_MISMATCH"),
                    );
                }

                // First, mark the payment link as inactive since payment was received
                if update_invoice_status_by_payment_id(payment_link_id, InvoiceStatus::Inactive) {
                    println!(
                        "Updated invoice status to inactive for payment link: {}",
                        payment_link_id
                    );
                } else {
                    println!(
                        "Failed to update invoice status to inactive for payment link: {}",
                        payment_link_id
                    );
                }

                match process_payment(invoice.clone(), amount_total).await {
                    Ok(payment_result) => {
                        println!(
                            "Payment processing successful - Transfer block: {}, Crypto amount: {}",
                            payment_result.block_index, payment_result.crypto_amount
                        );

                        // Mark invoice as paid after successful processing
                        if update_invoice_status_by_payment_id(payment_link_id, InvoiceStatus::Paid)
                        {
                            println!(
                                "Updated invoice status to paid for payment link: {}",
                                payment_link_id
                            );
                        } else {
                            println!(
                                "Failed to update invoice status to paid for payment link: {}",
                                payment_link_id
                            );
                        }

                        create_success_response(
                                    "Checkout session processed successfully - Funds sent to treasury account",
                                    Some(serde_json::json!({
                                        "user": user_principal.to_text(),
                                        "treasury_account_id": invoice.orbit_account_id,
                                        "treasury_owner": invoice.treasury_owner.to_text(),
                                        "has_subaccount": invoice.treasury_subaccount.is_some(),
                                        "amount_cents": amount_total,
                                        "usd_amount": amount_total as f64 / 100.0,
                                        "crypto_amount": payment_result.crypto_amount,
                                        "transfer_block": payment_result.block_index.to_string(),
                                        "payment_link_id": payment_link_id,
                                        "collateral": format!("{:?}", invoice.collateral),
                                    })),
                                )
                    }
                    Err(error) => {
                        println!("Failed to process payment: {}", error);
                        create_error_response(
                            500,
                            &format!("Failed to process payment: {}", error),
                            Some("PAYMENT_PROCESSING_FAILED"),
                        )
                    }
                }
            }
            None => {
                println!(
                    "Invoice not found for payment link: {}",
                    payment_link_id
                );
                create_error_response(
                    404,
                    "Invoice not found for this payment link",
                    Some("INVOICE_NOT_FOUND"),
                )
            }
        }
    } else {
        println!("Checkout session not paid or missing payment link ID");
        create_success_response("Checkout session received but not processed", None)
    }
}
