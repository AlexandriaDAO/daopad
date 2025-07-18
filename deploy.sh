#!/bin/bash
# Deploy daopad to local network

set -e

echo "=== Deploying daopad ==="

# Check if dfx is running
if ! dfx ping &>/dev/null; then
    echo "Starting dfx..."
    dfx start --clean --background --host 127.0.0.1:4943
    sleep 5
fi

# Clean and deploy
echo "Cleaning previous deployment..."
dfx canister uninstall-code --all 2>/dev/null || true

echo "Creating canisters..."
dfx canister create --all 2>/dev/null || echo "Canisters already created"

echo "Deploying backend..."
dfx deploy daopad_backend

echo "Deploying Internet Identity..."
dfx deps pull
dfx deps init
dfx deps deploy internet_identity

echo "Building frontend..."
cd src/daopad_frontend
npm install
npm run build
cd ../..

echo "Deploying frontend..."
dfx deploy daopad_frontend

echo "=== Deployment complete ==="
echo ""
echo "Backend canister: $(dfx canister id daopad_backend)"
echo "Frontend URL: http://$(dfx canister id daopad_frontend).localhost:4943"