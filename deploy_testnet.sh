#!/bin/bash
# Deploy daopad to IC testnet

set -e

echo "=== Deploying daopad to testnet ==="
export DFX_NETWORK=testnet

# Check for cycles wallet
echo "Checking testnet wallet..."
if ! dfx wallet --network testnet balance &>/dev/null; then
    echo "ERROR: No cycles wallet found on testnet"
    echo "Get free cycles from: https://internetcomputer.org/docs/current/developer-docs/setup/deploy/testnet"
    exit 1
fi

echo "Creating canisters..."
dfx canister create --all --network testnet 2>/dev/null || echo "Canisters already created"

echo "Deploying backend..."
dfx deploy daopad_backend --network testnet

# If ORBIT_CONTROL_PANEL_ID is set, update it in the backend
if [ ! -z "$ORBIT_CONTROL_PANEL_ID" ]; then
    echo "Setting Orbit Control Panel ID to: $ORBIT_CONTROL_PANEL_ID"
    dfx canister call daopad_backend set_orbit_control_panel_id "(\"$ORBIT_CONTROL_PANEL_ID\")" --network testnet
fi

echo "Building frontend..."
cd src/daopad_frontend
npm install
npm run build
cd ../..

echo "Deploying frontend..."
dfx deploy daopad_frontend --network testnet

echo "=== Deployment complete ==="
BACKEND_ID=$(dfx canister id daopad_backend --network testnet)
FRONTEND_ID=$(dfx canister id daopad_frontend --network testnet)

echo ""
echo "Backend canister: $BACKEND_ID"
echo "Frontend URL: https://$FRONTEND_ID.icp0.io"
echo "Backend Candid UI: https://a4gq6-oaaaa-aaaah-qaa4q-cai.raw.icp0.io/?id=$BACKEND_ID"

# Try to register with Orbit
echo ""
echo "=== Orbit Integration ==="
if [ ! -z "$ORBIT_CONTROL_PANEL_ID" ]; then
    echo "Attempting to register with Orbit control panel: $ORBIT_CONTROL_PANEL_ID"
    REGISTER_RESULT=$(dfx canister call daopad_backend register_with_orbit '()' --network testnet 2>&1)
    if [[ $REGISTER_RESULT == *"Ok"* ]]; then
        echo "✓ Successfully registered with Orbit"
        echo "✓ DAO treasury creation should now work!"
    else
        echo "Registration result: $REGISTER_RESULT"
    fi
else
    echo "No Orbit control panel ID provided"
    echo "To integrate with Orbit:"
    echo "1. Deploy Orbit control panel to testnet"
    echo "2. Run: ORBIT_CONTROL_PANEL_ID=<id> ./deploy_testnet.sh"
fi