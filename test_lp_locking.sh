#!/bin/bash

echo "=== Testing Subaccount-based LP Locking System ==="
echo ""

CANISTER_ID="7zv6y-5qaaa-aaaar-qbviq-cai"

echo "1. Getting LP address for current user..."
dfx canister --network ic call $CANISTER_ID get_my_lp_address
echo ""

echo "2. Getting current voting power (should be 0 initially)..."
dfx canister --network ic call $CANISTER_ID get_my_voting_power
echo ""

echo "3. Attempting to sync voting power from KongSwap..."
echo "This is the CRITICAL TEST - if it fails, KongSwap doesn't support account IDs"
dfx canister --network ic call $CANISTER_ID sync_my_voting_power
echo ""

echo "4. Checking updated voting power..."
dfx canister --network ic call $CANISTER_ID get_my_voting_power
echo ""

echo "=== Test Complete ==="
echo ""
echo "RESULTS ANALYSIS:"
echo "- If sync_my_voting_power returned Ok with a value: SUCCESS! Account IDs work"
echo "- If sync_my_voting_power returned an error about 'not found': Account IDs not supported"
echo "- The account ID to send LP tokens to: Check result from step 1"