# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-agreement-snapshot/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-agreement-snapshot/src/daopad`
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
   git commit -m "[Feature]: Operating Agreement Snapshot with Dedicated Route"
   git push -u origin feature/agreement-snapshot
   gh pr create --title "[Feature]: Operating Agreement Snapshot System" --body "Implements agreement-snapshot-plan.md"
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

**Branch:** `feature/agreement-snapshot`
**Worktree:** `/home/theseus/alexandria/daopad-agreement-snapshot/src/daopad`

---

# Implementation Plan

## 1. Current State Documentation

### Frontend Structure
- `daopad_frontend/src/components/operating-agreement/OperatingAgreementTab.tsx`: Main component (line 1-164)
  - Fetches agreement data on every page load via OrbitAgreementService
  - Renders AgreementDocument component with data
  - Has refresh/export buttons

- `daopad_frontend/src/services/backend/OrbitAgreementService.ts`: Service layer (line 1-183)
  - Calls multiple backend methods to gather agreement data
  - No caching, fetches fresh data every time

- `daopad_frontend/src/App.tsx`: Route structure (line 1-26)
  - Simple route setup with "/" and "/app" routes
  - Uses lazy loading for components

### Backend Structure
- `daopad_backend/src/storage/`: Storage patterns
  - Uses StableBTreeMap for persistent data (tokens, stations)
  - Uses regular BTreeMap for volatile data (proposals)
  - Memory IDs allocated: 0, 2, 3 (can use 4+)

- No existing agreement storage or caching methods

## 2. Implementation Pseudocode

### Backend: Storage Structure

#### `daopad_backend/src/storage/memory.rs` (MODIFY)
```rust
// PSEUDOCODE
// Add new memory ID for agreement snapshots
pub const AGREEMENT_SNAPSHOTS_MEM_ID: MemoryId = MemoryId::new(4);
```

#### `daopad_backend/src/storage/state.rs` (MODIFY)
```rust
// PSEUDOCODE
// Add agreement snapshot storage
use crate::types::AgreementSnapshot;

thread_local! {
    // Store agreement snapshots by token_id
    pub static AGREEMENT_SNAPSHOTS: RefCell<StableBTreeMap<StorablePrincipal, AgreementSnapshot, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(AGREEMENT_SNAPSHOTS_MEM_ID))
        )
    );
}
```

#### `daopad_backend/src/types/mod.rs` (MODIFY)
```rust
// PSEUDOCODE
// Define AgreementSnapshot type
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AgreementSnapshot {
    pub token_id: Principal,
    pub station_id: Principal,
    pub data: String,  // JSON stringified agreement data
    pub created_at: u64,
    pub updated_at: u64,
    pub version: u32,
}

// Make it storable
impl Storable for AgreementSnapshot {
    fn to_bytes(&self) -> Vec<u8> {
        // Serialize with Candid
    }

    fn from_bytes(bytes: Vec<u8>) -> Self {
        // Deserialize with Candid
    }
}

// Bounded trait implementation
impl BoundedStorable for AgreementSnapshot {
    const MAX_SIZE: u32 = 5_000_000; // 5MB max for agreement data
    const IS_FIXED_SIZE: bool = false;
}
```

### Backend: API Methods

#### `daopad_backend/src/api/agreement_snapshot.rs` (NEW)
```rust
// PSEUDOCODE
use crate::storage::state::AGREEMENT_SNAPSHOTS;
use crate::types::{AgreementSnapshot, StorablePrincipal};

#[query]
pub fn get_agreement_snapshot(token_id: Principal) -> Result<AgreementSnapshot, String> {
    let key = StorablePrincipal(token_id);
    AGREEMENT_SNAPSHOTS.with(|snapshots| {
        snapshots.borrow()
            .get(&key)
            .ok_or_else(|| "No snapshot found for token".to_string())
    })
}

#[update]
pub async fn regenerate_agreement_snapshot(
    token_id: Principal,
    station_id: Principal
) -> Result<AgreementSnapshot, String> {
    // 1. Call all the existing methods to gather data
    // - perform_security_check(station_id)
    // - get_request_policies_details(token_id)
    // - list_orbit_users(token_id)
    // - list_orbit_canisters(token_id, params)
    // - get_all_voting_powers_for_token(token_id)
    // - get_treasury_management_data(station_id)

    // 2. Combine all data into JSON string
    let agreement_data = serde_json::json!({
        "security": security_result,
        "policies": policies_result,
        "users": users_result,
        "canisters": canisters_result,
        "votingPowers": voting_powers_result,
        "treasury": treasury_result,
        "timestamp": ic_cdk::api::time()
    }).to_string();

    // 3. Create/update snapshot
    let snapshot = AgreementSnapshot {
        token_id,
        station_id,
        data: agreement_data,
        created_at: ic_cdk::api::time(),
        updated_at: ic_cdk::api::time(),
        version: existing_version + 1 // or 1 if new
    };

    // 4. Store in stable memory
    let key = StorablePrincipal(token_id);
    AGREEMENT_SNAPSHOTS.with(|snapshots| {
        snapshots.borrow_mut().insert(key, snapshot.clone());
    });

    Ok(snapshot)
}

#[query]
pub fn get_agreement_by_station(station_id: Principal) -> Result<AgreementSnapshot, String> {
    // Look up token_id from STATION_TO_TOKEN mapping
    // Then return the agreement snapshot for that token
}
```

#### `daopad_backend/src/api/mod.rs` (MODIFY)
```rust
// PSEUDOCODE
// Add new module
pub mod agreement_snapshot;
```

#### `daopad_backend/src/lib.rs` (MODIFY)
```rust
// PSEUDOCODE
// Export the new API methods
pub use api::agreement_snapshot::{
    get_agreement_snapshot,
    regenerate_agreement_snapshot,
    get_agreement_by_station
};
```

### Frontend: Standalone Agreement Route

#### `daopad_frontend/src/routes/OperatingAgreement.tsx` (NEW)
```javascript
// PSEUDOCODE
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Principal } from '@dfinity/principal';
import AgreementDocument from '../components/operating-agreement/AgreementDocument';

export default function OperatingAgreement() {
    const { stationId } = useParams();  // Get station ID from URL
    const [searchParams] = useSearchParams();
    const tokenSymbol = searchParams.get('token') || 'TOKEN';

    const [agreementData, setAgreementData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchAgreement() {
            try {
                // Call backend to get cached agreement by station ID
                const actor = await getBackendActor();
                const result = await actor.get_agreement_by_station(
                    Principal.fromText(stationId)
                );

                if (result.Ok) {
                    // Parse JSON data from snapshot
                    const data = JSON.parse(result.Ok.data);
                    setAgreementData(data);
                } else {
                    setError('Agreement not found');
                }
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }

        if (stationId) {
            fetchAgreement();
        }
    }, [stationId]);

    if (loading) return <div>Loading agreement...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!agreementData) return <div>No agreement found</div>;

    return (
        <div className="max-w-4xl mx-auto p-8 print:p-0">
            <AgreementDocument
                data={agreementData}
                tokenSymbol={tokenSymbol}
                stationId={stationId}
            />
            <div className="mt-8 text-center text-sm text-gray-500 print:hidden">
                Permanent link to this agreement: {window.location.href}
            </div>
        </div>
    );
}
```

#### `daopad_frontend/src/App.tsx` (MODIFY)
```javascript
// PSEUDOCODE
// Add new route
const OperatingAgreement = lazy(() => import('./routes/OperatingAgreement'));

// In Routes:
<Route path="/agreement/:stationId" element={<OperatingAgreement />} />
```

### Frontend: Update Token Dashboard

#### `daopad_frontend/src/components/operating-agreement/OperatingAgreementTab.tsx` (MODIFY)
```javascript
// PSEUDOCODE
const OperatingAgreementTab = ({ tokenId, stationId, tokenSymbol, identity }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [snapshotInfo, setSnapshotInfo] = useState(null);

    // Fetch cached snapshot on load
    const fetchSnapshot = async () => {
        setLoading(true);
        try {
            const actor = await getBackendActor();
            const result = await actor.get_agreement_snapshot(
                Principal.fromText(tokenId)
            );

            if (result.Ok) {
                const data = JSON.parse(result.Ok.data);
                setData(data);
                setSnapshotInfo({
                    created: new Date(Number(result.Ok.created_at) / 1000000),
                    version: result.Ok.version
                });
            }
        } catch (e) {
            setError('No snapshot available. Click regenerate to create one.');
        } finally {
            setLoading(false);
        }
    };

    // Regenerate snapshot
    const regenerateAgreement = async () => {
        setLoading(true);
        try {
            const actor = await getBackendActor();
            const result = await actor.regenerate_agreement_snapshot(
                Principal.fromText(tokenId),
                Principal.fromText(stationId)
            );

            if (result.Ok) {
                const data = JSON.parse(result.Ok.data);
                setData(data);
                setSnapshotInfo({
                    created: new Date(Number(result.Ok.created_at) / 1000000),
                    version: result.Ok.version
                });
                toast.success('Agreement regenerated successfully');
            }
        } catch (e) {
            setError('Failed to regenerate: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Get permanent link
    const permanentLink = `${window.location.origin}/agreement/${stationId}?token=${tokenSymbol}`;

    useEffect(() => {
        if (stationId && tokenId) {
            fetchSnapshot();
        }
    }, [stationId, tokenId]);

    return (
        <div>
            {/* Header with regenerate button and link */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3>LLC Operating Agreement</h3>
                            {snapshotInfo && (
                                <p className="text-sm text-gray-500">
                                    Version {snapshotInfo.version} •
                                    Generated: {snapshotInfo.created.toLocaleString()}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={regenerateAgreement}>
                                <RefreshCw /> Regenerate
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigator.clipboard.writeText(permanentLink)}
                            >
                                Copy Link
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.open(permanentLink, '_blank')}
                            >
                                Open Standalone
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Agreement content */}
            {data && <AgreementDocument data={data} />}
        </div>
    );
};
```

### Frontend: Update Services

#### `daopad_frontend/src/declarations/daopad_backend/daopad_backend.did` (AUTO-GENERATED)
```candid
// Will be auto-generated when candid-extractor runs
// Should include:
service : {
    get_agreement_snapshot : (Principal) -> (Result_AgreementSnapshot) query;
    regenerate_agreement_snapshot : (Principal, Principal) -> (Result_AgreementSnapshot);
    get_agreement_by_station : (Principal) -> (Result_AgreementSnapshot) query;
}
```

## 3. Testing Requirements

### Backend Testing
```bash
# Test snapshot creation
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai regenerate_agreement_snapshot '(
  principal "r7cp5-6aaaa-aaaal-qjsea-cai",
  principal "fec7w-zyaaa-aaaaa-qaffq-cai"
)'

# Test snapshot retrieval
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_agreement_snapshot '(
  principal "r7cp5-6aaaa-aaaal-qjsea-cai"
)'

# Test retrieval by station
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai get_agreement_by_station '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai"
)'
```

### Frontend Testing
1. Navigate to Token Dashboard
2. Go to Operating Agreement tab
3. Should load cached snapshot (or show "no snapshot" message)
4. Click Regenerate - should create/update snapshot
5. Copy permanent link
6. Open link in new tab - should show standalone agreement at `/agreement/{stationId}`
7. Verify agreement displays correctly without needing login

### URL Structure
- Dashboard view: `/app` → Token Dashboard → Operating Agreement tab
- Standalone view: `/agreement/{stationId}?token={symbol}`
- Example: `/agreement/fec7w-zyaaa-aaaaa-qaffq-cai?token=ALEX`

## 4. File Tree Changes

```
Before:
daopad_backend/
├── src/
│   ├── api/
│   │   └── mod.rs
│   ├── storage/
│   │   ├── memory.rs
│   │   └── state.rs
│   └── types/
│       └── mod.rs

daopad_frontend/
├── src/
│   ├── components/
│   │   └── operating-agreement/
│   │       └── OperatingAgreementTab.tsx
│   ├── routes/
│   │   └── AppRoute.tsx
│   └── App.tsx

After:
daopad_backend/
├── src/
│   ├── api/
│   │   ├── agreement_snapshot.rs (NEW)
│   │   └── mod.rs (MODIFIED)
│   ├── storage/
│   │   ├── memory.rs (MODIFIED)
│   │   └── state.rs (MODIFIED)
│   └── types/
│       └── mod.rs (MODIFIED)

daopad_frontend/
├── src/
│   ├── components/
│   │   └── operating-agreement/
│   │       └── OperatingAgreementTab.tsx (MODIFIED)
│   ├── routes/
│   │   ├── AppRoute.tsx
│   │   └── OperatingAgreement.tsx (NEW)
│   └── App.tsx (MODIFIED)
```

## 5. Implementation Order

1. Backend storage setup (memory.rs, state.rs, types/mod.rs)
2. Backend API methods (agreement_snapshot.rs, mod.rs, lib.rs)
3. Deploy backend and sync declarations
4. Frontend standalone route (OperatingAgreement.tsx, App.tsx)
5. Update OperatingAgreementTab to use snapshots
6. Deploy frontend
7. Test full flow

## Key Design Decisions

1. **Stable Storage**: Use StableBTreeMap to persist snapshots across upgrades
2. **JSON Storage**: Store agreement data as JSON string for flexibility
3. **Version Tracking**: Include version number for audit trail
4. **Station-based URL**: Use station ID in URL (permanent, unlike token ID)
5. **Query Methods**: Use query for reads, update for regenerate
6. **Lazy Loading**: Only regenerate when explicitly requested
7. **Public Access**: Standalone route doesn't require authentication

## Security Considerations

1. Agreement snapshots are public (query methods)
2. Only regeneration requires update call (costs cycles)
3. Station ID is permanent reference for legal documents
4. Version tracking ensures audit trail
5. 5MB limit prevents storage abuse