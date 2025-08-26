#!/bin/bash
# Test mainnet deployment

echo "Testing DAOPad Mainnet Deployment"
echo "=================================="
echo ""

# Switch to mainnet identity
echo "Using identity for mainnet testing..."
dfx identity use alex 2>/dev/null || echo "Identity 'alex' not found, using current identity"

echo ""
echo "1. Testing backend health check..."
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai health_check

echo ""
echo "2. Getting backend principal..."
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_backend_principal

echo ""
echo "3. Testing cache status..."
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_cache_status

echo ""
echo "4. Testing Alexandria proposals fetch (this may fail if not registered)..."
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_alexandria_proposals '(null)'

echo ""
echo "=================================="
echo "Testing complete!"
echo ""
echo "Frontend URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/"
echo ""
echo "If proposals fetch failed, the backend principal needs to be registered"
echo "with Alexandria Orbit Station (fec7w-zyaaa-aaaaa-qaffq-cai)"