#!/bin/bash

echo "Testing Orbit Station creation locally..."

# Get backend canister ID
BACKEND_ID=$(dfx canister id daopad_backend)
echo "Backend canister ID: $BACKEND_ID"

# First, let's add a test method to create station without Kong Locker check
# For now, let's try calling the internal method directly through a test endpoint

# Create test request
REQUEST='{"name": "Test Station", "token_canister_id": "aaaaa-aa"}'

echo "Creating Orbit Station..."
dfx canister call daopad_backend create_token_orbit_station "$REQUEST"

echo "Checking station list..."
dfx canister call daopad_backend list_all_orbit_stations

echo "Done!"