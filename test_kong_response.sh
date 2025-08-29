#!/bin/bash

echo "Testing KongSwap user_balances response format..."
echo ""

# Test with the canister's principal directly
CANISTER_PRINCIPAL="7zv6y-5qaaa-aaaar-qbviq-cai"
KONG_BACKEND="2ipq2-uqaaa-aaaar-qailq-cai"

echo "1. Testing with canister principal (original approach):"
dfx canister --network ic call $KONG_BACKEND user_balances "(\"$CANISTER_PRINCIPAL\")"

echo ""
echo "2. Testing with account ID:"
ACCOUNT_ID="8803b3d80fa45f9f2e8ca0ffe7d950f5e0cc93979f61466b6f320b5cfb035b58"
dfx canister --network ic call $KONG_BACKEND user_balances "(\"$ACCOUNT_ID\")"

echo ""
echo "Analysis:"
echo "- If (1) returns data: Original approach works"
echo "- If (2) returns data: Account ID approach works"
echo "- If both fail: Need to check KongSwap API"