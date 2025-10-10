#!/bin/bash
set -e

echo "🔍 Verifying declaration sync..."

DFX_DECL="src/declarations/daopad_backend/daopad_backend.did.js"
FRONTEND_DECL="src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js"

# Check if dfx declarations exist
if [ ! -f "$DFX_DECL" ]; then
  echo "❌ ERROR: dfx declarations not found"
  echo "   Expected: $DFX_DECL"
  echo ""
  echo "Run these commands first:"
  echo "  cargo build --target wasm32-unknown-unknown --release -p daopad_backend"
  echo "  candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did"
  echo "  dfx deploy daopad_backend --network ic"
  exit 1
fi

# Check if frontend declarations exist
if [ ! -f "$FRONTEND_DECL" ]; then
  echo "⚠️  WARNING: Frontend declarations not found"
  echo "   Expected: $FRONTEND_DECL"
  echo ""
  echo "Syncing now..."
  mkdir -p "src/daopad/daopad_frontend/src/declarations/daopad_backend"
  cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/
  echo "✅ Synced declarations"
  exit 0
fi

# Compare files
if diff -q "$DFX_DECL" "$FRONTEND_DECL" > /dev/null; then
  echo "✅ Declarations are in sync"
  echo "   dfx:      $DFX_DECL"
  echo "   frontend: $FRONTEND_DECL"
  exit 0
else
  echo "❌ DECLARATION MISMATCH!"
  echo ""
  echo "The following files should be identical but differ:"
  echo "   dfx:      $DFX_DECL"
  echo "   frontend: $FRONTEND_DECL"
  echo ""
  echo "This will cause 'is not a function' errors in production!"
  echo ""
  echo "Fix by running:"
  echo "  cp -r src/declarations/daopad_backend/* src/daopad/daopad_frontend/src/declarations/daopad_backend/"
  echo ""
  echo "Or re-run deploy.sh with backend changes."
  exit 1
fi
