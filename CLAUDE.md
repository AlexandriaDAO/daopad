# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This repository contains two separate but related projects:
1. **DAOPad** (`src/daopad/`) - DAO governance framework for managing Orbit Station
   - `daopad_backend` - Rust canister for governance operations
   - `daopad_frontend` - React interface for proposals and voting
   - `orbit_station` - Candid definitions for Orbit Station integration
   
2. **Kong Locker** (`src/kong_locker/`) - LP token locking and tracking service
   - `lp_locking` - Rust canister for LP token management
   - `lp_locker_frontend` - React interface for viewing LP positions

Both projects share the same root `dfx.json` and deployment script (`deploy.sh`) for unified deployment.

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
- **Backend** (`src/daopad/daopad_backend/src/lib.rs`): Rust canister that will execute admin operations on Orbit Station after DAO approval
- **Frontend** (`src/daopad/daopad_frontend/src/App.jsx`): React app for viewing proposals and voting interface
- **Governance Token**: Using Alexandria's $ALEX token for voting (test phase)
- **Development**: All testing happens on mainnet - the Orbit Station is for testing only (no real assets)

### Key Limitation
Query methods (like `list_requests`) cannot be called via inter-canister calls. This only affects reading data - the backend CAN and WILL execute update operations on Orbit Station.

### Canister IDs
- **DAOPad Backend (mainnet)**: `lwsav-iiaaa-aaaap-qp2qq-cai`
- **DAOPad Frontend (mainnet)**: `l7rlj-6aaaa-aaaaa-qaffq-cai`
- **LP Locker Frontend (mainnet)**: `c6w56-taaaa-aaaai-atlma-cai`
- **LP Locking Backend (mainnet)**: `7zv6y-5qaaa-aaaar-qbviq-cai`
- **Alexandria Orbit Station**: `fec7w-zyaaa-aaaaa-qaffq-cai`

## Project Components Clarification

**Kong Locker (konglocker.org)**: A standalone service for locking and tracking KongSwap liquidity positions. Users permanently lock their LP tokens here and receive a unique principal that represents their locked liquidity. This is a simple, immutable service focused solely on LP token management.
- Frontend canister: `lp_locker_frontend` (`src/kong_locker/lp_locker_frontend`) - User interface for viewing LP positions
- Backend canister: `lp_locking` (`src/kong_locker/lp_locking`) - Queries KongSwap and stores LP position data

**DAOPad**: A comprehensive governance framework that enables DAO management of Orbit Station wallets. Users register by providing their LP Locker principal as proof of locked liquidity, which grants them voting power to participate in treasury management and protocol decisions. DAOPad connects locked liquidity (from LP Locker) to governance rights (in Orbit Station).
- Frontend canister: `daopad_frontend` (`src/daopad/daopad_frontend`) - Governance interface and proposal viewer
- Backend canister: `daopad_backend` (`src/daopad/daopad_backend`) - Manages registrations and Orbit Station integration

## Development Workflow

**IMPORTANT**: This project NEVER uses local development. Everything deploys directly to mainnet IC. We test in production only.

## Key Commands

```bash
# Always use alex identity for mainnet deployment
dfx identity use alex

# Build backend
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked

# ALWAYS regenerate candid after Rust changes
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad_backend/daopad_backend.did

# Deploy (always to mainnet - we test in production)
./deploy.sh --network ic  # Full deployment (requires password - ONLY RUN BY USER)
./deploy.sh --network ic --backend-only  # Backend only
./deploy.sh --network ic --frontend-only  # Frontend only

# Frontend development (local dev server, but talks to mainnet)
cd src/daopad/daopad_frontend && npm install && npm run dev
cd src/kong_locker/lp_locker_frontend && npm install && npm run start

# Test backend functions directly on mainnet
dfx canister --network ic call daopad_backend get_alexandria_config
dfx canister --network ic call daopad_backend get_backend_principal
dfx canister --network ic call lp_locking get_all_voting_powers
```

## Entry Points

### DAOPad Project
- **Backend**: `src/daopad/daopad_backend/src/lib.rs` - Main canister logic  
- **Frontend**: `src/daopad/daopad_frontend/src/App.jsx` - React application root
- **Alexandria Module**: `src/daopad/daopad_backend/src/alexandria_dao.rs` - Orbit integration
- **Orbit Station DID**: `src/daopad/orbit_station/` - Candid definitions for Orbit Station

### Kong Locker Project
- **LP Locker Frontend**: `src/kong_locker/lp_locker_frontend/src/App.jsx` - LP token locking interface
- **LP Locking Backend**: `src/kong_locker/lp_locking/src/lib.rs` - LP token management canister

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

- **CRITICAL**: Only the USER can run deployment commands (`./deploy.sh`) due to encrypted identity requirements
- When code changes are complete, Claude should ask the user to run the appropriate deploy command  
- Backend canister must be registered in Orbit Station for any access
- The `remote` config in dfx.json breaks deployment - already removed
- Use `--backend-only` to avoid unnecessary frontend rebuilds
- Use `--frontend-only` to deploy only frontend changes

## For Claude Code

When working on this project:
1. **NEVER attempt to run deployment commands** - they require encrypted identity access
2. **NEVER suggest local development** - this project only uses mainnet
3. **After completing changes**, ask the user to run the appropriate deploy command:
   - `./deploy.sh --network ic --frontend-only` for frontend-only changes
   - `./deploy.sh --network ic --backend-only` for backend-only changes  
   - `./deploy.sh --network ic` for full deployment
4. All testing and development happens directly on mainnet IC