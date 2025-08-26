# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

**Goal**: Transform Orbit into a DAO framework by making the DAOPad backend canister THE admin of Orbit Station, where Alexandria's $ALEX token stakers vote on admin decisions before execution.

## What is Orbit?

Orbit is a platform layer for ICP that simplifies blockchain application development. Key components:
- **Station**: A trustless multi-custody canister for managing digital assets and operations
- **Control Panel**: Facilitates common operations for managing Orbit Stations
- **Current limitation**: Orbit uses human admins (centralized)
- **Our solution**: DAOPad backend becomes the admin, controlled by DAO governance

## Architecture Overview

DAOPad integrates with Alexandria DAO's Orbit Station (`fec7w-zyaaa-aaaaa-qaffq-cai`):
- **Backend** (`src/daopad_backend/src/lib.rs`): Rust canister that will execute admin operations on Orbit Station after DAO approval
- **Frontend** (`src/daopad_frontend/src/App.jsx`): React app for viewing proposals and voting interface
- **Governance Token**: Using Alexandria's $ALEX token for voting (test phase)
- **Development**: All testing happens on mainnet - the Orbit Station is for testing only (no real assets)

### Key Limitation
Query methods (like `list_requests`) cannot be called via inter-canister calls. This only affects reading data - the backend CAN and WILL execute update operations on Orbit Station.

### Canister IDs
- **DAOPad Backend (mainnet)**: `lwsav-iiaaa-aaaap-qp2qq-cai`
- **DAOPad Frontend (mainnet)**: `l7rlj-6aaaa-aaaaa-qaffq-cai`
- **Alexandria Orbit Station**: `fec7w-zyaaa-aaaaa-qaffq-cai`

## Key Commands

```bash
# Always use alex identity for mainnet testing
dfx identity use alex

# Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# ALWAYS regenerate candid after Rust changes
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad_backend/daopad_backend.did

# Deploy (always to mainnet - we test in production)
./deploy.sh --network ic  # Full deployment (requires password)
./deploy.sh --network ic --backend-only  # Backend only

# Frontend development (still local dev server, but talks to mainnet)
cd src/daopad_frontend && npm install && npm run dev

# Test backend functions directly on mainnet
dfx canister --network ic call daopad_backend get_alexandria_config
dfx canister --network ic call daopad_backend get_backend_principal
```

## Entry Points

- **Backend**: `src/daopad_backend/src/lib.rs` - Main canister logic
- **Frontend**: `src/daopad_frontend/src/App.jsx` - React application root
- **Alexandria Module**: `src/daopad_backend/src/alexandria_dao.rs` - Orbit integration

## Current Integration Status

1. **Query Limitation**: Cannot read Orbit data via inter-canister calls (queries can't call queries)
2. **Update Operations**: Backend WILL execute admin operations on Orbit Station (future implementation)
3. **Frontend Reads**: Must call Orbit Station directly for viewing proposals
4. **Backend Admin**: Will become Orbit Station admin after DAO governance implementation

## Known Issues

- **"ic0_call_new" error**: Query methods cannot make inter-canister calls
- **Decoding errors**: Orbit uses inline records in variants, not named types
- **Password prompts**: Mainnet deployment needs manual password entry for alex identity

## Deployment Notes

- Backend canister must be registered in Orbit Station for any access
- The `remote` config in dfx.json breaks deployment - already removed
- Use `--backend-only` to avoid unnecessary frontend rebuilds