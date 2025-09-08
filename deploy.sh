#!/bin/bash
# Unified deployment script for DAOPad
# Usage: ./deploy.sh [--network ic] [--fresh] [--backend-only|--frontend-only]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Parse arguments
NETWORK="local"
FRESH_DEPLOY=false
DEPLOY_TARGET="all"
ALEXANDRIA_STATION_ID="fec7w-zyaaa-aaaaa-qaffq-cai"

# Track deployment success
BACKEND_DEPLOYED=false
FRONTEND_DEPLOYED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --network)
            NETWORK="$2"
            shift 2
            ;;
        --fresh)
            FRESH_DEPLOY=true
            shift
            ;;
        --backend-only)
            DEPLOY_TARGET="backend"
            shift
            ;;
        --frontend-only)
            DEPLOY_TARGET="frontend"
            shift
            ;;
        --help)
            echo "Usage: ./deploy.sh [options]"
            echo ""
            echo "Options:"
            echo "  --network ic        Deploy to mainnet (default: local)"
            echo "  --fresh            Clean deployment (uninstalls code first)"
            echo "  --backend-only     Deploy only the backend"
            echo "  --frontend-only    Deploy only the frontend"
            echo "  --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./deploy.sh                    # Deploy to local"
            echo "  ./deploy.sh --network ic       # Deploy to mainnet"
            echo "  ./deploy.sh --fresh            # Fresh local deployment"
            echo "  ./deploy.sh --network ic --backend-only  # Deploy only backend to mainnet"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Display deployment configuration
echo "================================================"
echo "DAOPad Deployment"
echo "================================================"
echo "Network: $NETWORK"
echo "Target: $DEPLOY_TARGET"
echo "Fresh deploy: $FRESH_DEPLOY"

if [ "$NETWORK" == "ic" ]; then
    echo ""
    echo "Mainnet Canister IDs (from canister_ids.json):"
    if [ -f "canister_ids.json" ]; then
        BACKEND_ID=$(jq -r '.daopad_backend.ic // empty' canister_ids.json)
        FRONTEND_ID=$(jq -r '.daopad_frontend.ic // empty' canister_ids.json)
        [ -n "$BACKEND_ID" ] && echo "  Backend:  $BACKEND_ID"
        [ -n "$FRONTEND_ID" ] && echo "  Frontend: $FRONTEND_ID"
    fi
    echo "  Alexandria Station: $ALEXANDRIA_STATION_ID"
fi

echo "================================================"
echo ""

# Check network connection
if [ "$NETWORK" == "local" ]; then
    # Check if dfx is running for local
    if ! dfx ping &>/dev/null; then
        echo "ERROR: dfx is not running. Please start it manually"
        echo "Run: dfx start --background --host 127.0.0.1:4943"
        exit 1
    fi
else
    # For mainnet, use daopad identity (no password required for Claude)
    echo "Switching to daopad identity for mainnet deployment..."
    dfx identity use daopad
    IDENTITY=$(dfx identity whoami)
    echo "Using identity: $IDENTITY"
    echo ""
    
    # Set environment variable to suppress the plaintext identity warning if using daopad
    export DFX_WARNING=-mainnet_plaintext_identity
fi

# Handle fresh deployment if requested
if [ "$FRESH_DEPLOY" = true ] && [ "$NETWORK" == "local" ]; then
    if [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "backend" ]; then
        echo "Fresh deployment requested - uninstalling backend canister..."
        dfx canister uninstall-code daopad_backend 2>/dev/null || true
        echo "Backend canister uninstalled for fresh initialization"
    fi
fi

# Deploy backend (includes kong_locker)
if [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "backend" ]; then
    echo ""
    echo "Building backend canisters..."
    
    # Build DAOPad backend
    echo "Building daopad_backend..."
    if ! cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked; then
        echo "❌ DAOPad backend build failed!"
        exit 1
    fi
    
    # Extract candid interface for daopad_backend
    echo "Extracting Candid interface for daopad_backend..."
    if command -v candid-extractor &> /dev/null; then
        candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
        echo "✓ Candid interface extracted"
    else
        echo "❌ ERROR: candid-extractor not found!"
        echo "Please install with: cargo install candid-extractor"
        exit 1
    fi
    
    # Build LP Locking canister
    echo "Building kong_locker..."
    if ! cargo build --target wasm32-unknown-unknown --release -p kong_locker --locked; then
        echo "❌ LP Locking build failed!"
        exit 1
    fi
    
    # Extract candid interface for kong_locker
    echo "Extracting Candid interface for kong_locker..."
    if command -v candid-extractor &> /dev/null; then
        candid-extractor target/wasm32-unknown-unknown/release/kong_locker.wasm > src/kong_locker/kong_locker/kong_locker.did
        echo "✓ Candid interface extracted"
    else
        echo "❌ ERROR: candid-extractor not found!"
        echo "Please install with: cargo install candid-extractor"
        exit 1
    fi
    
    # No Rust build needed for kong_locker_frontend - it's a frontend asset canister
    
    # Deploy DAOPad backend
    echo "Deploying daopad_backend..."
    if [ "$NETWORK" == "ic" ]; then
        # Deploy to mainnet using standard dfx deploy
        echo "Deploying daopad_backend to mainnet..."
        if dfx deploy --network ic daopad_backend --argument "(opt \"$ALEXANDRIA_STATION_ID\")"; then
            echo "✓ DAOPad backend deployed successfully"
            BACKEND_DEPLOYED=true
        else
            echo "❌ DAOPad backend deployment failed!"
            exit 1
        fi
    else
        # For local deployment
        if dfx deploy daopad_backend --argument "(opt \"$ALEXANDRIA_STATION_ID\")"; then
            echo "✓ DAOPad backend deployed successfully"
            BACKEND_DEPLOYED=true
        else
            echo "❌ DAOPad backend deployment failed!"
            exit 1
        fi
    fi
    
    # Deploy LP Locking canister with specified ID
    echo "Deploying kong_locker..."
    if [ "$NETWORK" == "ic" ]; then
        # Deploy to mainnet with specified ID
        echo "Deploying kong_locker to mainnet..."
        if dfx deploy --network ic kong_locker --specified-id eazgb-giaaa-aaaap-qqc2q-cai; then
            echo "✓ LP Locking deployed successfully"
        else
            echo "❌ LP Locking deployment failed!"
            exit 1
        fi
    else
        # For local deployment, also use specified ID
        if dfx deploy kong_locker --specified-id eazgb-giaaa-aaaap-qqc2q-cai; then
            echo "✓ LP Locking deployed successfully (local with specified ID)"
        else
            echo "❌ LP Locking deployment failed!"
            exit 1
        fi
    fi
    
    # kong_locker_frontend is now deployed as a frontend asset canister, not here
fi

# Deploy frontend
if [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "frontend" ]; then
    echo ""
    echo "Building frontend..."
    cd src/daopad/daopad_frontend
    
    if ! npm install; then
        echo "❌ npm install failed!"
        cd ../..
        exit 1
    fi
    
    # Generate declarations for backend
    echo "Generating backend declarations..."
    dfx generate daopad_backend || echo "Warning: Failed to generate backend declarations"
    
    if ! npm run build; then
        echo "❌ Frontend build failed!"
        cd ../..
        exit 1
    fi
    
    cd ../..
    
    echo "Deploying frontend..."
    if [ "$NETWORK" == "ic" ]; then
        # Deploy to mainnet using standard dfx deploy
        echo "Deploying frontend to mainnet..."
        if dfx deploy --network ic daopad_frontend; then
            FRONTEND_ID=$(dfx canister --network ic id daopad_frontend 2>/dev/null || echo "unknown")
            echo "✓ Frontend deployed successfully"
            echo "   Frontend URL: https://$FRONTEND_ID.icp0.io/"
            FRONTEND_DEPLOYED=true
        else
            echo "❌ Frontend deployment failed!"
            exit 1
        fi
    else
        # Deploy Internet Identity for local development
        if [ "$NETWORK" == "local" ] && [ "$DEPLOY_TARGET" == "all" ]; then
            if dfx canister id internet_identity >/dev/null 2>&1; then
                echo "Internet Identity already deployed, skipping..."
            else
                echo "Deploying Internet Identity..."
                if ! dfx deploy internet_identity; then
                    echo "⚠️  Internet Identity deployment failed, continuing anyway..."
                fi
            fi
        fi
        
        # Deploy frontend locally
        if dfx deploy daopad_frontend; then
            echo "✓ Frontend deployed successfully"
            FRONTEND_DEPLOYED=true
        else
            echo "❌ Frontend deployment failed!"
            exit 1
        fi
    fi
    
    # Build and Deploy LP Lock Frontend (React app for LP locking)
    echo ""
    echo "Building LP Lock Frontend..."
    # Make sure we're in the right directory first
    cd "$SCRIPT_DIR"
    cd src/kong_locker/kong_locker_frontend
    
    if ! npm install; then
        echo "❌ npm install failed for LP Lock Frontend!"
        cd ../..
        exit 1
    fi
    
    if ! npm run build; then
        echo "❌ LP Lock Frontend build failed!"
        cd ../..
        exit 1
    fi
    
    cd ../..
    
    echo "Deploying LP Lock Frontend..."
    if [ "$NETWORK" == "ic" ]; then
        echo "Deploying LP Lock Frontend to mainnet..."
        if dfx deploy --network ic kong_locker_frontend --specified-id c6w56-taaaa-aaaai-atlma-cai; then
            LP_LOCK_FRONTEND_ID=$(dfx canister --network ic id kong_locker_frontend 2>/dev/null || echo "c6w56-taaaa-aaaai-atlma-cai")
            echo "✓ LP Lock Frontend deployed successfully"
            echo "   LP Lock Frontend URL: https://$LP_LOCK_FRONTEND_ID.icp0.io/"
            LP_LOCK_FRONTEND_DEPLOYED=true
        else
            echo "❌ LP Lock Frontend deployment failed!"
            exit 1
        fi
    else
        if dfx deploy kong_locker_frontend --specified-id c6w56-taaaa-aaaai-atlma-cai; then
            echo "✓ LP Lock Frontend deployed successfully (local)"
            LP_LOCK_FRONTEND_DEPLOYED=true
        else
            echo "❌ LP Lock Frontend deployment failed!"
            exit 1
        fi
    fi
fi

# Display deployment summary
echo ""
echo "================================================"
echo "Deployment Summary"
echo "================================================"

if [ "$NETWORK" == "ic" ]; then
    echo ""
    echo "Mainnet Status:"
    if [ "$BACKEND_DEPLOYED" == true ]; then
        BACKEND_ID=$(dfx canister --network ic id daopad_backend 2>/dev/null || echo "unknown")
        echo "  ✓ Backend:  $BACKEND_ID"
    elif [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "backend" ]; then
        echo "  ❌ Backend:  Deployment failed"
    fi
    
    if [ "$FRONTEND_DEPLOYED" == true ]; then
        FRONTEND_ID=$(dfx canister --network ic id daopad_frontend 2>/dev/null || echo "unknown")
        echo "  ✓ Frontend: https://$FRONTEND_ID.icp0.io/"
    elif [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "frontend" ]; then
        echo "  ❌ Frontend: Deployment failed"
    fi
    
    if [ "$LP_LOCK_FRONTEND_DEPLOYED" == true ]; then
        LP_LOCK_FRONTEND_ID=$(dfx canister --network ic id kong_locker_frontend 2>/dev/null || echo "c6w56-taaaa-aaaai-atlma-cai")
        echo "  ✓ LP Lock Frontend: https://$LP_LOCK_FRONTEND_ID.icp0.io/"
    fi
    
    if [ "$BACKEND_DEPLOYED" == true ]; then
        echo ""
        echo "Next steps for backend:"
        echo "1. Get the backend principal:"
        echo "   dfx canister --network ic call daopad_backend get_backend_principal"
        echo ""
        echo "2. Register the principal with Alexandria Orbit Station ($ALEXANDRIA_STATION_ID)"
        echo ""
        echo "3. Test the integration:"
        echo "   dfx canister --network ic call daopad_backend get_cache_status"
        echo "   dfx canister --network ic call daopad_backend get_alexandria_proposals"
    fi
else
    echo ""
    echo "Local Status:"
    if [ "$BACKEND_DEPLOYED" == true ]; then
        BACKEND_ID=$(dfx canister id daopad_backend)
        echo "  ✓ Backend:  $BACKEND_ID"
        echo "    Candid UI: http://127.0.0.1:4943/?canisterId=$(dfx canister id __Candid_UI 2>/dev/null || echo 'vpyes-67777-77774-qaaeq-cai')&id=$BACKEND_ID"
    elif [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "backend" ]; then
        echo "  ❌ Backend: Deployment failed"
    fi
    
    if [ "$FRONTEND_DEPLOYED" == true ]; then
        FRONTEND_ID=$(dfx canister id daopad_frontend)
        echo "  ✓ Frontend: http://$FRONTEND_ID.localhost:4943"
    elif [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "frontend" ]; then
        echo "  ❌ Frontend: Deployment failed"
    fi
    
    if [ "$BACKEND_DEPLOYED" == true ]; then
        echo ""
        echo "Testing backend locally:"
        echo "  dfx canister call daopad_backend get_backend_principal"
        echo "  dfx canister call daopad_backend get_cache_status"
    fi
fi

# Show overall status
echo ""
if [ "$BACKEND_DEPLOYED" == false ] && [ "$FRONTEND_DEPLOYED" == false ]; then
    echo "⚠️  No components were successfully deployed. Please check the errors above."
elif [ "$BACKEND_DEPLOYED" == false ] || [ "$FRONTEND_DEPLOYED" == false ]; then
    echo "⚠️  Some components failed to deploy. Please check the warnings above."
else
    echo "✅ All requested components deployed successfully!"
fi

echo "================================================"