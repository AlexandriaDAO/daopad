#!/bin/bash
# Test local deployment

echo "Testing DAOPad Local Deployment"
echo "================================"
echo ""

echo "1. Backend Health Check:"
dfx canister call daopad_backend health_check
echo ""

echo "2. Backend Principal:"
dfx canister call daopad_backend get_backend_principal  
echo ""

echo "3. Cache Status:"
dfx canister call daopad_backend get_cache_status
echo ""

echo "4. Alexandria Station ID:"
dfx canister call daopad_backend get_alexandria_station_id
echo ""

echo "5. Testing Proposals Fetch (will fail locally - expected):"
dfx canister call daopad_backend get_alexandria_proposals '(null)'
echo ""

echo "================================"
echo "Frontend URL: http://ufxgi-4p777-77774-qaadq-cai.localhost:4943"
echo "Backend Candid UI: http://127.0.0.1:4943/?canisterId=vpyes-67777-77774-qaaeq-cai&id=ucwa4-rx777-77774-qaada-cai"
echo ""
echo "NOTE: The proposals fetch will fail locally because the mainnet"
echo "Alexandria Station canister (fec7w-zyaaa-aaaaa-qaffq-cai) is not"
echo "accessible from the local network."
echo "================================"