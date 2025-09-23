#!/bin/bash
# DAOPad-specific deployment script
# Usage: ./deploy.sh [--network ic] [--fresh] [--backend-only|--frontend-only]

set -e

# Get the directory where this script is located (src/daopad)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the root directory (two levels up from src/daopad)
ROOT_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"

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
echo "Working from: $ROOT_DIR"

if [ "$NETWORK" == "ic" ]; then
    echo ""
    echo "Mainnet Canister IDs:"
    echo "  Backend:  lwsav-iiaaa-aaaap-qp2qq-cai"
    echo "  Frontend: l7rlj-6aaaa-aaaaa-qaffq-cai"
    echo "  Alexandria Station: $ALEXANDRIA_STATION_ID"
fi

echo "================================================"
echo ""

# Change to root directory for all operations
cd "$ROOT_DIR"

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

# Deploy backend
if [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "backend" ]; then
    echo ""
    echo "Building DAOPad backend..."
    
    # Build DAOPad backend
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
fi

# Deploy frontend
if [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "frontend" ]; then
    echo ""
    echo "Building DAOPad frontend..."
    cd src/daopad/daopad_frontend
    
    if ! npm install; then
        echo "❌ npm install failed!"
        cd "$ROOT_DIR"
        exit 1
    fi
    
    # Generate declarations for backend
    echo "Generating backend declarations..."
    dfx generate daopad_backend || echo "Warning: Failed to generate backend declarations"

    # Sync declarations to frontend location
    echo "🔄 Syncing declarations to frontend..."
    GENERATED_DIR="$ROOT_DIR/src/declarations/daopad_backend"
    FRONTEND_DIR="$SCRIPT_DIR/daopad_frontend/src/declarations/daopad_backend"

    if [ -d "$GENERATED_DIR" ] && [ -d "$(dirname "$FRONTEND_DIR")" ]; then
        mkdir -p "$FRONTEND_DIR"
        cp -r "$GENERATED_DIR"/* "$FRONTEND_DIR"/ 2>/dev/null || true
        echo "✅ Declarations synced successfully"

        # Verify sync worked
        if [ -f "$GENERATED_DIR/daopad_backend.did.js" ] && [ -f "$FRONTEND_DIR/daopad_backend.did.js" ]; then
            if diff -q "$GENERATED_DIR/daopad_backend.did.js" "$FRONTEND_DIR/daopad_backend.did.js" > /dev/null; then
                echo "✅ Declaration sync verified"
            else
                echo "⚠️  Warning: Declaration sync may have failed"
            fi
        fi
    else
        echo "⚠️  Warning: Could not sync declarations (directories not found)"
    fi

    if ! npm run build; then
        echo "❌ Frontend build failed!"
        cd "$ROOT_DIR"
        exit 1
    fi
    
    cd "$ROOT_DIR"
    
    echo "Deploying DAOPad frontend..."
    if [ "$NETWORK" == "ic" ]; then
        # Deploy to mainnet using standard dfx deploy
        echo "Deploying frontend to mainnet..."
        if dfx deploy --network ic daopad_frontend; then
            FRONTEND_ID=$(dfx canister --network ic id daopad_frontend 2>/dev/null || echo "l7rlj-6aaaa-aaaaa-qaffq-cai")
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
fi

# Display deployment summary
echo ""
echo "================================================"
echo "DAOPad Deployment Summary"
echo "================================================"

if [ "$NETWORK" == "ic" ]; then
    echo ""
    echo "Mainnet Status:"
    if [ "$BACKEND_DEPLOYED" == true ]; then
        BACKEND_ID=$(dfx canister --network ic id daopad_backend 2>/dev/null || echo "lwsav-iiaaa-aaaap-qp2qq-cai")
        echo "  ✓ Backend:  $BACKEND_ID"
    elif [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "backend" ]; then
        echo "  ❌ Backend:  Deployment failed"
    fi
    
    if [ "$FRONTEND_DEPLOYED" == true ]; then
        FRONTEND_ID=$(dfx canister --network ic id daopad_frontend 2>/dev/null || echo "l7rlj-6aaaa-aaaaa-qaffq-cai")
        echo "  ✓ Frontend: https://$FRONTEND_ID.icp0.io/"
    elif [ "$DEPLOY_TARGET" == "all" ] || [ "$DEPLOY_TARGET" == "frontend" ]; then
        echo "  ❌ Frontend: Deployment failed"
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
    echo "✅ All requested DAOPad components deployed successfully!"
fi

echo "================================================"