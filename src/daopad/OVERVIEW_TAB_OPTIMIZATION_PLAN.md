# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-overview-tab-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-overview-tab-fix/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
   - Frontend changes:
     ```bash
     npm run build
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "[Feature]: Overview Tab Performance & Anonymous Access Optimization"
   git push -u origin feature/overview-tab-fix
   gh pr create --title "[Feature]: Overview Tab Performance & Anonymous Access" --body "Implements OVERVIEW_TAB_OPTIMIZATION_PLAN.md"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view [NUM] --json comments`
     - Count P0 issues
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/overview-tab-fix`
**Worktree:** `/home/theseus/alexandria/daopad-overview-tab-fix/src/daopad`

---

# Implementation Plan: Overview Tab Performance Optimization

## Problem Statement

The Overview tab (`/dao/:tokenId`) is the first page users see when clicking a DAO card. Current issues:

1. **No aggregate statistics** - Just shows navigation cards, no actual DAO data
2. **Sequential data loading** - Station info → Token metadata (blocks rendering)
3. **Missing key metrics**:
   - Total treasury value
   - Active proposal count
   - Member/voter count
   - Recent activity summary
4. **No anonymous access optimization** - Same patterns from PR #95 needed
5. **Slow initial load** - Users wait without seeing meaningful data

## Current State Analysis

### Frontend Components

**File: `daopad_frontend/src/routes/DaoRoute.tsx`**
- Fetches station info first (lines 38-56)
- Then fetches token metadata if authenticated (lines 59-94)
- Sequential pattern causes waterfall loading
- Already handles anonymous users correctly

**File: `daopad_frontend/src/routes/dao/DaoOverview.tsx`**
- Very simple component - just displays token info and navigation cards
- Uses `useOutletContext` to get data from parent route
- No data fetching, no aggregate stats displayed
- Authentication check hides "Your Participation" card (line 42)

**File: `daopad_frontend/src/components/dao/DaoLayout.tsx`**
- Tab navigation wrapper
- Shows token symbol, canister ID, station ID in header
- No issues here

### Backend API

**File: `daopad_backend/src/api/orbit.rs`**

Existing methods:
- `get_orbit_station_for_token` (line 34) - Query method, gets station ID
- `list_orbit_accounts` (line 88) - Update method, treasury accounts
- `get_orbit_system_info` (line 55) - Update method, station metadata
- `get_treasury_management_data` (line 340) - Comprehensive treasury data

**File: `daopad_backend/src/api/orbit_users.rs`**
- `list_orbit_users` (line 18) - Gets all Orbit Station members

**File: `daopad_backend/src/proposals/storage.rs`**
- `get_active_proposal_for_token` - Gets single active proposal
- `get_all_active_proposals` (line 43) - Gets all active proposals
- Storage: `TREASURY_PROPOSALS`, `ORBIT_REQUEST_PROPOSALS`, `ORBIT_PROPOSALS`

**What's Missing:**
- No single endpoint to aggregate: treasury total, proposal counts, member counts
- No method to get proposal stats for a specific token
- No method to get treasury value summary without full account details

## Solution Design

### 1. Backend: Aggregate Overview Endpoint

Create new method `get_dao_overview(token_id)` that returns:
- Treasury total value (sum of all account balances)
- Active proposal count (across all types)
- Total member count (from Orbit Station)
- Recent proposal count (last 30 days)
- Station status/info

**Performance Strategy:**
- Parallel Orbit queries where possible
- Cache-friendly design (can add caching later)
- Minimal computation (count, sum only)

### 2. Frontend: Parallel Data Fetching

Modify `DaoRoute.tsx` to fetch:
- Station info (existing)
- Token metadata (existing)
- **NEW:** Overview stats

All three in parallel, non-blocking.

### 3. Frontend: Enhanced Overview Display

Update `DaoOverview.tsx` to show:
- DAO info card (existing)
- **NEW:** Treasury summary card
- **NEW:** Governance activity card
- **NEW:** Community stats card
- Navigation cards (existing)

All visible to anonymous users.

## Implementation Details

### Backend Changes

#### File: `daopad_backend/src/api/orbit_overview.rs` (NEW)

```rust
// PSEUDOCODE
use candid::{Nat, Principal};
use ic_cdk::update;
use crate::storage::state::{
    TOKEN_ORBIT_STATIONS, TREASURY_PROPOSALS,
    ORBIT_REQUEST_PROPOSALS, ORBIT_PROPOSALS
};
use crate::types::StorablePrincipal;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DaoOverviewStats {
    pub treasury_total_icp: u64,        // Total ICP across all accounts
    pub treasury_account_count: u64,    // Number of accounts
    pub active_proposal_count: u64,     // All active proposals
    pub recent_proposal_count: u64,     // Proposals in last 30 days
    pub member_count: u64,              // Orbit Station members
    pub station_id: Option<Principal>,  // Station principal
    pub station_name: Option<String>,   // From system_info
}

#[update]
pub async fn get_dao_overview(
    token_canister_id: Principal
) -> Result<DaoOverviewStats, String> {
    // 1. Get station ID (or return minimal stats if no station)
    let station_id = TOKEN_ORBIT_STATIONS.with(|stations| {
        stations.borrow()
            .get(&StorablePrincipal(token_canister_id))
            .map(|s| s.0)
    });

    let Some(station_id) = station_id else {
        // DAO has no treasury yet - return minimal stats
        return Ok(DaoOverviewStats {
            treasury_total_icp: 0,
            treasury_account_count: 0,
            active_proposal_count: count_active_proposals(token_canister_id),
            recent_proposal_count: count_recent_proposals(token_canister_id, 30),
            member_count: 0,
            station_id: None,
            station_name: None,
        });
    };

    // 2. Query Orbit Station in parallel using join
    // - list_accounts (for treasury total)
    // - list_users (for member count)
    // - system_info (for station name)

    let accounts_future = list_accounts_call(station_id);
    let users_future = list_users_call(station_id);
    let system_info_future = system_info_call(station_id);

    // Execute in parallel
    let (accounts_result, users_result, system_info_result) =
        futures::join!(accounts_future, users_future, system_info_future);

    // 3. Process results
    let treasury_total = calculate_total_icp(&accounts_result);
    let account_count = accounts_result.map(|a| a.len()).unwrap_or(0);
    let member_count = users_result.map(|u| u.len()).unwrap_or(0);
    let station_name = system_info_result.ok()
        .and_then(|info| info.name);

    // 4. Count proposals from storage
    let active_count = count_active_proposals(token_canister_id);
    let recent_count = count_recent_proposals(token_canister_id, 30);

    Ok(DaoOverviewStats {
        treasury_total_icp: treasury_total,
        treasury_account_count: account_count as u64,
        active_proposal_count: active_count,
        recent_proposal_count: recent_count,
        member_count: member_count as u64,
        station_id: Some(station_id),
        station_name,
    })
}

// Helper: Count active proposals across all types
fn count_active_proposals(token_id: Principal) -> u64 {
    let mut count = 0u64;

    // Treasury proposals
    TREASURY_PROPOSALS.with(|proposals| {
        count += proposals.borrow()
            .values()
            .filter(|p| p.token_canister_id == token_id
                     && p.status == ProposalStatus::Active)
            .count() as u64;
    });

    // Orbit request proposals (keyed by (token, request_id))
    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        count += proposals.borrow()
            .iter()
            .filter(|((token, _), p)| token.0 == token_id
                                   && p.status == ProposalStatus::Active)
            .count() as u64;
    });

    // Orbit link proposals
    ORBIT_PROPOSALS.with(|proposals| {
        if let Some(p) = proposals.borrow()
            .get(&StorablePrincipal(token_id)) {
            if p.status == ProposalStatus::Active {
                count += 1;
            }
        }
    });

    count
}

// Helper: Count recent proposals (within days)
fn count_recent_proposals(token_id: Principal, days: u64) -> u64 {
    let now = ic_cdk::api::time();
    let threshold = now - (days * 24 * 60 * 60 * 1_000_000_000);

    let mut count = 0u64;

    // Same pattern as count_active but filter by created_at >= threshold
    TREASURY_PROPOSALS.with(|proposals| {
        count += proposals.borrow()
            .values()
            .filter(|p| p.token_canister_id == token_id
                     && p.created_at >= threshold)
            .count() as u64;
    });

    ORBIT_REQUEST_PROPOSALS.with(|proposals| {
        count += proposals.borrow()
            .iter()
            .filter(|((token, _), p)| token.0 == token_id
                                   && p.created_at >= threshold)
            .count() as u64;
    });

    // Note: OrbitLinkProposal doesn't have created_at - skip or add field

    count
}

// Helper: Calculate total ICP balance
fn calculate_total_icp(accounts_result: &Result<Vec<Account>, String>) -> u64 {
    let Ok(accounts) = accounts_result else {
        return 0;
    };

    accounts.iter()
        .flat_map(|account| &account.assets)
        .filter(|asset| asset.symbol == "ICP")
        .filter_map(|asset| asset.balance.as_ref())
        .map(|balance| nat_to_u64(&balance.balance))
        .sum()
}

// Helper: nat to u64 conversion
fn nat_to_u64(nat: &Nat) -> u64 {
    let bytes = nat.0.to_bytes_le();
    if bytes.len() <= 8 {
        let mut array = [0u8; 8];
        array[..bytes.len()].copy_from_slice(&bytes);
        u64::from_le_bytes(array)
    } else {
        u64::MAX
    }
}

// Helper functions for Orbit calls
async fn list_accounts_call(station_id: Principal) -> Result<Vec<Account>, String> {
    // Use existing list_accounts pattern from orbit.rs
    let input = ListAccountsInput {
        search_term: None,
        paginate: None,
    };

    let result: Result<(ListAccountsResult,), _> =
        ic_cdk::call(station_id, "list_accounts", (input,)).await;

    match result {
        Ok((ListAccountsResult::Ok { accounts, .. },)) => Ok(accounts),
        Ok((ListAccountsResult::Err(e),)) => Err(format!("List accounts error: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg))
    }
}

async fn list_users_call(station_id: Principal) -> Result<Vec<UserDTO>, String> {
    // Use existing list_users pattern from orbit_users.rs
    let input = ListUsersInput {
        search_term: None,
        statuses: None,
        groups: None,
        paginate: None,
    };

    let result: Result<(ListUsersResult,), _> =
        ic_cdk::call(station_id, "list_users", (input,)).await;

    match result {
        Ok((ListUsersResult::Ok { users, .. },)) => Ok(users),
        Ok((ListUsersResult::Err(e),)) => Err(format!("List users error: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg))
    }
}

async fn system_info_call(station_id: Principal) -> Result<SystemInfo, String> {
    // Use existing system_info pattern from orbit.rs
    let result: Result<(SystemInfoResult,), _> =
        ic_cdk::call(station_id, "system_info", ()).await;

    match result {
        Ok((SystemInfoResult::Ok { system },)) => Ok(system),
        Ok((SystemInfoResult::Err(e),)) => Err(format!("System info error: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg))
    }
}
```

#### File: `daopad_backend/src/api/mod.rs` (MODIFY)

```rust
// PSEUDOCODE
// Add new module
pub mod orbit_overview;

// Export in lib.rs as well
```

#### File: `daopad_backend/src/lib.rs` (MODIFY)

```rust
// PSEUDOCODE
// Export the new function
pub use api::orbit_overview::get_dao_overview;
```

### Frontend Changes

#### File: `daopad_frontend/src/services/backend/types.ts` (MODIFY)

```typescript
// PSEUDOCODE
export interface DaoOverviewStats {
  treasury_total_icp: bigint;
  treasury_account_count: bigint;
  active_proposal_count: bigint;
  recent_proposal_count: bigint;
  member_count: bigint;
  station_id: Principal | null;
  station_name: string | null;
}

// Helper to convert BigInt fields to numbers safely
export function convertOverviewStats(
  stats: DaoOverviewStats
): DaoOverviewStatsDisplay {
  return {
    treasury_total_icp: Number(stats.treasury_total_icp),
    treasury_account_count: Number(stats.treasury_account_count),
    active_proposal_count: Number(stats.active_proposal_count),
    recent_proposal_count: Number(stats.recent_proposal_count),
    member_count: Number(stats.member_count),
    station_id: stats.station_id,
    station_name: stats.station_name,
  };
}

export interface DaoOverviewStatsDisplay {
  treasury_total_icp: number;
  treasury_account_count: number;
  active_proposal_count: number;
  recent_proposal_count: number;
  member_count: number;
  station_id: Principal | null;
  station_name: string | null;
}
```

#### File: `daopad_frontend/src/services/backend/index.ts` (MODIFY)

```typescript
// PSEUDOCODE
export class DAOPadBackendService {
  // ... existing methods ...

  async getDaoOverview(
    tokenId: Principal
  ): Promise<ApiResponse<DaoOverviewStatsDisplay>> {
    try {
      const actor = await this.getActor();
      const result = await actor.get_dao_overview(tokenId);

      // Convert BigInt fields to numbers
      const converted = convertOverviewStats(result);

      return {
        success: true,
        data: converted,
      };
    } catch (error) {
      console.error('[Backend] getDaoOverview error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

#### File: `daopad_frontend/src/routes/DaoRoute.tsx` (MODIFY)

```typescript
// PSEUDOCODE
export default function DaoRoute() {
  const { tokenId } = useParams();
  const { identity, isAuthenticated } = useSelector((state: any) => state.auth);
  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orbitStation, setOrbitStation] = useState<any>(null);
  const [overviewStats, setOverviewStats] = useState<DaoOverviewStatsDisplay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadToken() {
      if (!tokenId) {
        setError('No token ID provided');
        setLoading(false);
        return;
      }

      try {
        const tokenService = getTokenService(identity);
        let principal: Principal;

        try {
          principal = Principal.fromText(tokenId);
        } catch (e) {
          console.error('[DaoRoute] Invalid principal:', tokenId, e);
          setError('Invalid token ID format');
          setLoading(false);
          return;
        }

        // PARALLEL DATA FETCHING (critical performance optimization)
        const [stationResult, metadataResult, overviewResult] = await Promise.all([
          // 1. Station info (existing)
          tokenService.getStationForToken(principal).catch(e => {
            console.warn('[DaoRoute] Station fetch failed:', e);
            return { success: false, error: e };
          }),

          // 2. Token metadata (only if authenticated)
          isAuthenticated && identity
            ? tokenService.getTokenMetadata(principal).catch(e => {
                console.warn('[DaoRoute] Metadata fetch failed:', e);
                return { success: false, error: e };
              })
            : Promise.resolve({ success: false }),

          // 3. Overview stats (NEW - works for anonymous)
          tokenService.getDaoOverview(principal).catch(e => {
            console.warn('[DaoRoute] Overview fetch failed:', e);
            return { success: false, error: e };
          }),
        ]);

        // Process station info
        if (stationResult.success && stationResult.data) {
          const stationId = typeof stationResult.data === 'string'
            ? stationResult.data
            : stationResult.data.toString();

          setOrbitStation({
            station_id: stationId,
            name: `${tokenId} Treasury`
          });
        }

        // Process overview stats
        if (overviewResult.success && overviewResult.data) {
          setOverviewStats(overviewResult.data);
        }

        // Process token metadata
        if (metadataResult.success && metadataResult.data) {
          setToken({
            canister_id: tokenId,
            symbol: metadataResult.data.symbol || tokenId.slice(0, 5).toUpperCase(),
            name: metadataResult.data.name || 'Token'
          });
        } else {
          // Fallback for anonymous or failed metadata
          setToken({
            canister_id: tokenId,
            symbol: tokenId.slice(0, 5).toUpperCase(),
            name: 'Token'
          });
        }

        setLoading(false);
      } catch (e) {
        console.error('[DaoRoute] Error loading token:', e);
        setError('Failed to load token data');
        setLoading(false);
      }
    }

    loadToken();
  }, [tokenId, identity, isAuthenticated]);

  if (loading) {
    return <FallbackLoader />;
  }

  if (error || !token) {
    return <Navigate to="/app" replace />;
  }

  // Pass overview stats to child routes via context
  return (
    <DaoLayout token={token} orbitStation={orbitStation}>
      <Outlet context={{
        token,
        orbitStation,
        overviewStats,  // NEW
        identity,
        isAuthenticated
      }} />
    </DaoLayout>
  );
}
```

#### File: `daopad_frontend/src/routes/dao/DaoOverview.tsx` (MODIFY)

```typescript
// PSEUDOCODE
import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OrbitStationPlaceholder from '../../components/orbit/OrbitStationPlaceholder';
import type { DaoOverviewStatsDisplay } from '../../services/backend/types';

export default function DaoOverview() {
  const {
    token,
    orbitStation,
    overviewStats,
    identity,
    isAuthenticated
  } = useOutletContext<any>();

  return (
    <div className="space-y-6" data-testid="dao-overview">
      {/* Basic DAO information */}
      <Card className="bg-executive-darkGray border-executive-mediumGray">
        <CardHeader>
          <CardTitle className="text-executive-ivory">DAO Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-executive-ivory">{token.symbol} DAO</h2>
            <p className="text-executive-lightGray/70 mt-1">{token.name}</p>
            <p className="text-sm text-executive-lightGray/50 font-mono mt-2">
              Token Canister: {token.canister_id}
            </p>
          </div>

          {orbitStation ? (
            <div className="mt-4 p-4 bg-executive-mediumGray/30 rounded">
              <p className="text-sm text-executive-lightGray">
                <span className="text-executive-gold">Treasury Station:</span>{' '}
                <span className="font-mono">{orbitStation.station_id}</span>
              </p>
              <p className="text-sm text-green-600 mt-2">✓ DAO is operational</p>
            </div>
          ) : (
            <div className="mt-4">
              <OrbitStationPlaceholder tokenSymbol={token.symbol} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* NEW: Treasury Summary (visible to everyone) */}
      {overviewStats && overviewStats.treasury_total_icp > 0 && (
        <Card
          className="bg-executive-darkGray border-executive-mediumGray"
          data-testid="treasury-summary"
        >
          <CardHeader>
            <CardTitle className="text-executive-ivory">💰 Treasury Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <StatItem
              label="Total Value"
              value={`${formatICP(overviewStats.treasury_total_icp)} ICP`}
              testId="treasury-total"
            />
            <StatItem
              label="Accounts"
              value={overviewStats.treasury_account_count.toString()}
              testId="account-count"
            />
          </CardContent>
        </Card>
      )}

      {/* NEW: Governance Activity (visible to everyone) */}
      {overviewStats && (
        <Card
          className="bg-executive-darkGray border-executive-mediumGray"
          data-testid="governance-activity"
        >
          <CardHeader>
            <CardTitle className="text-executive-ivory">📊 Governance Activity</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <StatItem
              label="Active Proposals"
              value={overviewStats.active_proposal_count.toString()}
              testId="active-proposals"
            />
            <StatItem
              label="Recent (30 days)"
              value={overviewStats.recent_proposal_count.toString()}
              testId="recent-proposals"
            />
          </CardContent>
        </Card>
      )}

      {/* NEW: Community Stats (visible to everyone) */}
      {overviewStats && overviewStats.member_count > 0 && (
        <Card
          className="bg-executive-darkGray border-executive-mediumGray"
          data-testid="community-stats"
        >
          <CardHeader>
            <CardTitle className="text-executive-ivory">👥 Community</CardTitle>
          </CardHeader>
          <CardContent>
            <StatItem
              label="Members"
              value={overviewStats.member_count.toString()}
              testId="member-count"
            />
          </CardContent>
        </Card>
      )}

      {/* Your Participation (authenticated only) */}
      {isAuthenticated && (
        <Card className="bg-executive-darkGray border-executive-mediumGray">
          <CardHeader>
            <CardTitle className="text-executive-ivory">Your Participation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-executive-lightGray/70">
              Connect your Kong Locker to see your voting power and participation metrics.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation cards to tabs (existing) */}
      <div className="grid md:grid-cols-3 gap-4">
        <NavCard
          to={`/dao/${token.canister_id}/treasury`}
          title="Treasury"
          description="View accounts, balances, and manage treasury assets"
          icon="💰"
        />
        <NavCard
          to={`/dao/${token.canister_id}/activity`}
          title="Activity"
          description="Recent proposals, requests, and governance activity"
          icon="📊"
        />
        <NavCard
          to={`/dao/${token.canister_id}/settings`}
          title="Settings"
          description="Manage DAO configuration and permissions"
          icon="⚙️"
        />
        <NavCard
          to={`/dao/${token.canister_id}/agreement`}
          title="Operating Agreement"
          description="View the DAO's operating agreement and bylaws"
          icon="📜"
        />
        <NavCard
          to={`/dao/${token.canister_id}/canisters`}
          title="Canisters"
          description="Manage canister infrastructure and deployments"
          icon="🔧"
        />
      </div>
    </div>
  );
}

// Helper component for stat display
interface StatItemProps {
  label: string;
  value: string;
  testId?: string;
}

function StatItem({ label, value, testId }: StatItemProps) {
  return (
    <div data-testid={testId}>
      <p className="text-sm text-executive-lightGray/70">{label}</p>
      <p className="text-2xl font-bold text-executive-ivory mt-1">{value}</p>
    </div>
  );
}

// Format ICP with proper decimals (8 decimals)
function formatICP(e8s: number): string {
  const icp = e8s / 100_000_000;
  return icp.toFixed(2);
}

// ... existing NavCard component unchanged ...
```

### Testing Requirements

#### Backend Testing

```bash
# Build backend
cd /home/theseus/alexandria/daopad-overview-tab-fix/src/daopad
cargo build --target wasm32-unknown-unknown --release -p daopad_backend

# Extract candid
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did

# Verify new method in candid
grep "get_dao_overview" daopad_backend/daopad_backend.did

# Deploy backend
./deploy.sh --network ic --backend-only

# Test with dfx
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_dao_overview '(principal "nq4qv-wqaaa-aaaaq-qmc6a-cai")'

# Expected response structure:
# (
#   variant {
#     Ok = record {
#       treasury_total_icp = 1234567890 : nat64;
#       treasury_account_count = 3 : nat64;
#       active_proposal_count = 2 : nat64;
#       recent_proposal_count = 5 : nat64;
#       member_count = 10 : nat64;
#       station_id = opt principal "fec7w-zyaaa-aaaaa-qaffq-cai";
#       station_name = opt "ALEX DAO Treasury";
#     }
#   }
# )
```

#### Frontend Testing

```bash
# Sync declarations (CRITICAL - see Declaration Sync Bug in CLAUDE.md)
cd /home/theseus/alexandria/daopad-overview-tab-fix/src/daopad
cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/

# Verify new method in declarations
grep "get_dao_overview" daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js

# Build and deploy frontend
npm run build
./deploy.sh --network ic --frontend-only

# Manual testing
# Open: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/nq4qv-wqaaa-aaaaq-qmc6a-cai
# Check:
# - Overview tab loads quickly
# - Treasury summary shows total ICP and account count
# - Governance activity shows proposal counts
# - Community stats show member count
# - All visible without authentication
# - Network tab shows parallel requests (not sequential waterfall)
```

#### E2E Testing (Playwright)

Create: `daopad_frontend/e2e/dao-overview.spec.ts`

```typescript
// PSEUDOCODE
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io';
const TEST_DAO = 'nq4qv-wqaaa-aaaaq-qmc6a-cai'; // ALEX token

test.describe('DAO Overview - Anonymous Access', () => {
  test('should load overview tab with all stats for anonymous user', async ({ page }) => {
    // Navigate to DAO overview
    await page.goto(`${BASE_URL}/dao/${TEST_DAO}`);

    // Wait for overview tab to load
    await page.waitForSelector('[data-testid="dao-overview"]');

    // Verify basic DAO info loads
    await expect(page.locator('text=DAO Information')).toBeVisible();

    // Verify treasury summary loads (if DAO has treasury)
    const treasurySummary = page.locator('[data-testid="treasury-summary"]');
    if (await treasurySummary.isVisible()) {
      await expect(page.locator('[data-testid="treasury-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="account-count"]')).toBeVisible();
    }

    // Verify governance activity loads
    await expect(page.locator('[data-testid="governance-activity"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-proposals"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-proposals"]')).toBeVisible();

    // Verify community stats load (if DAO has members)
    const communityStats = page.locator('[data-testid="community-stats"]');
    if (await communityStats.isVisible()) {
      await expect(page.locator('[data-testid="member-count"]')).toBeVisible();
    }

    // Verify navigation cards still present
    await expect(page.locator('text=Treasury')).toBeVisible();
    await expect(page.locator('text=Activity')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should load overview tab quickly (performance)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/dao/${TEST_DAO}`);
    await page.waitForSelector('[data-testid="dao-overview"]');

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds (parallel fetching optimization)
    expect(loadTime).toBeLessThan(5000);

    console.log(`Overview tab loaded in ${loadTime}ms`);
  });

  test('should handle DAOs without treasury gracefully', async ({ page }) => {
    // Test with a DAO that doesn't have Orbit Station yet
    // (This would be a token that hasn't created treasury)

    // For now, just verify the placeholder works
    await page.goto(`${BASE_URL}/dao/${TEST_DAO}`);

    // Should still show DAO info even if no treasury
    await expect(page.locator('[data-testid="dao-overview"]')).toBeVisible();
  });
});

test.describe('DAO Overview - Network Performance', () => {
  test('should fetch data in parallel, not sequentially', async ({ page }) => {
    // Listen to network requests
    const requests: any[] = [];

    page.on('request', req => {
      if (req.url().includes('query') || req.url().includes('update')) {
        requests.push({
          url: req.url(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto(`${BASE_URL}/dao/${TEST_DAO}`);
    await page.waitForSelector('[data-testid="dao-overview"]');

    // Analyze request timing
    // Parallel requests should have similar timestamps (within ~500ms)
    // Sequential would be >1000ms apart

    if (requests.length >= 2) {
      const timeDiff = Math.abs(requests[1].timestamp - requests[0].timestamp);
      expect(timeDiff).toBeLessThan(1000);
      console.log(`Parallel fetch gap: ${timeDiff}ms`);
    }
  });
});
```

Run tests:
```bash
cd daopad_frontend
npx playwright test e2e/dao-overview.spec.ts
```

## Performance Benchmarks

**Before (Sequential):**
- Station fetch: ~800ms
- Metadata fetch: ~600ms (after station)
- Total: ~1400ms waterfall
- No stats displayed

**After (Parallel):**
- All fetches start simultaneously: ~800ms total
- Overview stats included: no extra delay
- Performance improvement: ~600ms (43% faster)
- User sees meaningful data immediately

## Migration & Rollback

**Safe to deploy:**
- New backend method doesn't break existing code
- Frontend changes are additive (no removals)
- Fallback behavior if overview fetch fails
- DAOs without treasuries handled gracefully

**Rollback:**
If issues arise, revert frontend changes only - backend method is harmless.

## Success Criteria

- ✅ Overview tab loads in <2 seconds for anonymous users
- ✅ Treasury total visible without authentication
- ✅ Proposal counts visible without authentication
- ✅ Member count visible without authentication
- ✅ Parallel data fetching (no sequential waterfall)
- ✅ Playwright tests pass for anonymous access
- ✅ No BigInt conversion errors in console
- ✅ Graceful handling of DAOs without treasury

## References

- PR #95: Treasury Dashboard Loading Fix (anonymous access patterns)
- `PLAYWRIGHT_TESTING_GUIDE.md`: Testing best practices
- `CLAUDE.md`: Declaration sync bug, deployment process
- Orbit Reference: `../../orbit-reference/core/station/` for API patterns
