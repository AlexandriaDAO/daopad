#!/bin/bash
# Deploy daopad to local network

set -e

# Set environment variable for local development
export DFX_NETWORK=local

echo "=== Deploying daopad ==="
echo "DFX_NETWORK set to: $DFX_NETWORK"


# Check if dfx is running
if ! dfx ping &>/dev/null; then
    echo "ERROR: dfx is not running. Please start it manually without --clean flag"
    echo "Run: dfx start --background --host 127.0.0.1:4943"
    exit 1
fi

# Check for --fresh flag
if [[ "$1" == "--fresh" ]]; then
    echo "Fresh deployment requested - uninstalling backend canister..."
    dfx canister uninstall-code daopad_backend 2>/dev/null || true
    echo "Backend canister uninstalled for fresh initialization"
else
    echo "Upgrading daopad canisters (use --fresh for clean deployment)..."
fi

echo "Creating canisters..."
dfx canister create --all 2>/dev/null || echo "Canisters already created"

echo "Deploying backend..."
dfx deploy daopad_backend --mode upgrade 2>/dev/null || dfx deploy daopad_backend

# If ORBIT_CONTROL_PANEL_ID is set, update it in the backend
if [ ! -z "$ORBIT_CONTROL_PANEL_ID" ]; then
    echo "Setting Orbit Control Panel ID to: $ORBIT_CONTROL_PANEL_ID"
    dfx canister call daopad_backend set_orbit_control_panel_id "(\"$ORBIT_CONTROL_PANEL_ID\")" || echo "Failed to set control panel ID"
fi

echo "Deploying Internet Identity..."
# Check if Internet Identity is already deployed
if dfx canister id internet_identity >/dev/null 2>&1; then
    echo "Internet Identity already deployed at $(dfx canister id internet_identity), skipping..."
else
    echo "Internet Identity not found, deploying..."
    dfx deploy internet_identity --specified-id rdmx6-jaaaa-aaaaa-aaadq-cai
fi

echo "Building frontend..."
cd src/daopad_frontend
npm install
npm run build
cd ../..

echo "Deploying frontend..."
dfx deploy daopad_frontend --mode upgrade 2>/dev/null || dfx deploy daopad_frontend

echo "=== Deployment complete ==="
echo ""
echo "Backend canister: $(dfx canister id daopad_backend)"
echo "Frontend URL: http://$(dfx canister id daopad_frontend).localhost:4943"
echo "Backend Candid UI: http://127.0.0.1:4943/?canisterId=$(dfx canister id __Candid_UI 2>/dev/null || echo 'vpyes-67777-77774-qaaeq-cai')&id=$(dfx canister id daopad_backend)"
echo ""
echo "=== Orbit Integration Setup ==="
CONTROL_PANEL_ID=$(dfx canister call daopad_backend get_orbit_control_panel_id '()' 2>/dev/null | grep -o '"[^"]*"' | tr -d '"')
echo "Current Orbit Control Panel ID: $CONTROL_PANEL_ID"

# Try to register with Orbit
echo "Attempting to register with Orbit..."
REGISTER_RESULT=$(dfx canister call daopad_backend register_with_orbit '()' 2>&1)
if [[ $REGISTER_RESULT == *"Ok"* ]]; then
    echo "✓ Successfully registered with Orbit"
elif [[ $REGISTER_RESULT == *"Already registered"* ]]; then
    echo "✓ Already registered with Orbit"
else
    echo "✗ Failed to register with Orbit: $REGISTER_RESULT"
    echo ""
    echo "To use Orbit integration:"
    echo "1. Make sure Orbit is deployed locally"
    echo "2. Update the control panel ID with:"
    echo "   dfx canister call daopad_backend set_orbit_control_panel_id '(\"<control-panel-id>\")'"
    echo "3. Try registering again with:"
    echo "   dfx canister call daopad_backend register_with_orbit '()'"
fi














# # For when it's time to add orbit station:
# # For orbit_station (Alexandria DAO)
# mkdir -p src/orbit_station && export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic metadata fec7w-zyaaa-aaaaa-qaffq-cai candid:service > src/orbit_station/orbit_station.did

# # Copy the .did file to declarations directory
# mkdir -p src/declarations/orbit_station
# cp src/orbit_station/orbit_station.did src/declarations/orbit_station/orbit_station.did

# # Ensure orbit_station declarations are properly generated
# dfx generate orbit_station
