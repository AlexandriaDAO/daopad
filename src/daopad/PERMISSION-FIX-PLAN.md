# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-permission-fix/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-permission-fix/src/daopad`
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
   git commit -m "[Security]: Remove dangerous permissions from Operator group"
   git push -u origin feature/permission-fix
   gh pr create --title "[Security]: Remove dangerous permissions from Operator group" --body "Implements PERMISSION-FIX-PLAN.md"
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

**Branch:** `feature/permission-fix`
**Worktree:** `/home/theseus/alexandria/daopad-permission-fix/src/daopad`

---

# Implementation Plan: Remove Dangerous Permissions from Operator Group

## Context
Security dashboard shows critical issues where the Operator group (UUID: `00000000-0000-4000-8000-000000000001`) has dangerous permissions including:
- Account.Transfer - Can transfer treasury funds without approval
- Account.Create - Can create new accounts
- User.Create/Update - Can manage users
- Asset.Create/Update/Delete - Can modify assets
- AddressBook.Create/Update/Delete - Can modify address book

Test station: `fec7w-zyaaa-aaaaa-qaffq-cai`
Verified request format with dfx successfully creates EditPermission requests.

## Current State Documentation

### 1. Backend has `orbit_permissions.rs`
File: `daopad_backend/src/api/orbit_permissions.rs`
- Has `create_edit_permission_request` at lines 67-110
- BUT MISSING: Does NOT create proposal for governance
- This violates the governance requirement from CLAUDE.md

### 2. Frontend has SecurityDashboard
File: `daopad_frontend/src/components/security/SecurityDashboard.tsx`
- Already displays security issues
- Has AdminRemovalActions component for removing admins
- MISSING: Component for fixing permission issues

### 3. No existing PermissionService
- Need to create `OrbitPermissionService.ts` similar to `OrbitUserService.ts`

## Implementation (PSEUDOCODE)

### Backend: Fix `daopad_backend/src/api/orbit_permissions.rs` (MODIFY)
```rust
// PSEUDOCODE - Add after line 101-109
pub async fn create_edit_permission_request(
    ...existing params...
) -> Result<String, String> {
    // ... existing code creates request ...

    match result.0 {
        CreateRequestResult::Ok(response) => {
            let request_id = response.request.id;

            // CRITICAL: Auto-create proposal for governance
            use crate::proposals::{ensure_proposal_for_request, OrbitRequestType};

            // Infer token_canister_id from station_id
            let token_canister_id = get_token_for_station(&station_id)?;

            match ensure_proposal_for_request(
                token_canister_id,
                request_id.clone(),
                OrbitRequestType::EditPermission,  // 70% threshold
            ).await {
                Ok(proposal_id) => Ok(request_id),
                Err(e) => Err(format!("GOVERNANCE VIOLATION: Created Orbit request but failed to create proposal: {:?}", e))
            }
        }
        CreateRequestResult::Err(e) => {
            Err(format!("Orbit returned error: {:?}", e))
        }
    }
}

// Add new function for easy permission fixing
#[ic_cdk::update]
pub async fn remove_permission_from_operator_group(
    token_canister_id: Principal,
    resource: Resource
) -> Result<String, String> {
    // Get station ID for token
    let station_id = get_station_for_token(&token_canister_id)?;

    // Get current permission
    let current = get_station_permission(station_id, resource.clone()).await?;

    // Filter out Operator group UUID
    let filtered_groups = current.allow.user_groups
        .into_iter()
        .filter(|id| id != "00000000-0000-4000-8000-000000000001")
        .collect();

    // Create edit request with filtered groups
    create_edit_permission_request(
        station_id,
        resource,
        current.allow.auth_scope,
        current.allow.users,
        Some(filtered_groups)
    ).await
}
```

### Frontend: Create `daopad_frontend/src/services/backend/orbit/permissions/OrbitPermissionService.ts` (NEW)
```typescript
// PSEUDOCODE
export class OrbitPermissionService extends DAOPadBackendService {
    async listPermissions(tokenId: string | Principal) {
        const actor = await this.getActor();
        const principal = this.ensurePrincipal(tokenId);
        const stationId = await this.getStationId(principal);

        const result = await actor.list_station_permissions(stationId, []);
        return this.handleServiceResult(result);
    }

    async removePermissionFromOperator(tokenId: string | Principal, resource: any) {
        const actor = await this.getActor();
        const principal = this.ensurePrincipal(tokenId);

        const requestId = await actor.remove_permission_from_operator_group(
            principal,
            resource
        );

        return {
            success: true,
            data: { requestId },
            error: null
        };
    }

    async fixCriticalPermissions(tokenId: string | Principal) {
        // Batch fix all critical permissions
        const criticalResources = [
            { Account: { Transfer: { Any: null } } },
            { Account: { Create: null } },
            { User: { Create: null } },
            { User: { Update: { Any: null } } },
            { Asset: { Create: null } },
            { Asset: { Update: { Any: null } } },
            { Asset: { Delete: { Any: null } } }
        ];

        const results = [];
        for (const resource of criticalResources) {
            try {
                const result = await this.removePermissionFromOperator(tokenId, resource);
                results.push({ resource, success: true, requestId: result.data.requestId });
            } catch (error) {
                results.push({ resource, success: false, error: error.message });
            }
        }

        return { success: true, data: results };
    }
}
```

### Frontend: Create `daopad_frontend/src/components/security/PermissionFixActions.tsx` (NEW)
```jsx
// PSEUDOCODE
export default function PermissionFixActions({ tokenId, stationId, identity }) {
    const [permissions, setPermissions] = useState([]);
    const [fixing, setFixing] = useState(false);
    const [criticalIssues, setCriticalIssues] = useState([]);
    const { toast } = useToast();

    useEffect(() => {
        loadPermissions();
    }, [tokenId]);

    async function loadPermissions() {
        const service = new OrbitPermissionService(identity);
        const result = await service.listPermissions(tokenId);

        if (result.success) {
            // Filter for Operator group permissions
            const operatorPerms = result.data.filter(p =>
                p.allow.user_groups.includes("00000000-0000-4000-8000-000000000001")
            );

            // Identify critical ones
            const critical = operatorPerms.filter(p => {
                const resource = p.resource;
                return (
                    (resource.Account?.Transfer?.Any) ||
                    (resource.Account?.Create) ||
                    (resource.User?.Create) ||
                    (resource.User?.Update) ||
                    (resource.Asset)
                );
            });

            setCriticalIssues(critical);
            setPermissions(operatorPerms);
        }
    }

    async function handleFixPermission(permission) {
        setFixing(true);
        const service = new OrbitPermissionService(identity);

        try {
            const result = await service.removePermissionFromOperator(
                tokenId,
                permission.resource
            );

            if (result.success) {
                toast({
                    title: "Proposal Created",
                    description: `Permission fix proposal created. Vote in Governance tab. Request ID: ${result.data.requestId}`,
                });
                await loadPermissions();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setFixing(false);
        }
    }

    async function handleFixAll() {
        const confirmed = confirm(
            `Create ${criticalIssues.length} proposals to fix all critical permissions?`
        );
        if (!confirmed) return;

        setFixing(true);
        const service = new OrbitPermissionService(identity);
        const result = await service.fixCriticalPermissions(tokenId);

        const successCount = result.data.filter(r => r.success).length;
        toast({
            title: "Proposals Created",
            description: `Created ${successCount} proposals. Vote in Governance tab.`
        });

        await loadPermissions();
        setFixing(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fix Dangerous Permissions</CardTitle>
                <CardDescription>
                    Remove dangerous permissions from Operator group
                </CardDescription>
            </CardHeader>
            <CardContent>
                {criticalIssues.length > 0 ? (
                    <div>
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                {criticalIssues.length} critical permissions found on Operator group
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2 mb-4">
                            {criticalIssues.map((perm, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 border rounded">
                                    <span>{formatResource(perm.resource)}</span>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleFixPermission(perm)}
                                        disabled={fixing || !identity}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleFixAll}
                            disabled={fixing || !identity}
                            className="w-full"
                        >
                            Fix All Critical Permissions
                        </Button>
                    </div>
                ) : (
                    <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                            No dangerous permissions found on Operator group
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

function formatResource(resource) {
    // Format resource for display
    if (resource.Account?.Transfer?.Any) return "Account.Transfer (Any)";
    if (resource.Account?.Create) return "Account.Create";
    if (resource.User?.Create) return "User.Create";
    if (resource.User?.Update) return "User.Update";
    if (resource.Asset?.Create) return "Asset.Create";
    if (resource.Asset?.Update) return "Asset.Update";
    if (resource.Asset?.Delete) return "Asset.Delete";
    // ... more resource types
    return JSON.stringify(resource);
}
```

### Frontend: Update `daopad_frontend/src/components/security/SecurityDashboard.tsx` (MODIFY)
```jsx
// PSEUDOCODE - Add imports
import PermissionFixActions from './PermissionFixActions';

// Add after AdminRemovalActions component (around line 180)
{/* Permission Fix Actions */}
{securityData?.issues?.some(i => i.category === 'Treasury Control') && (
    <PermissionFixActions
        tokenId={tokenId}
        stationId={stationId}
        identity={identity}
    />
)}
```

### Frontend: Export service in `daopad_frontend/src/services/backend/index.ts` (MODIFY)
```typescript
// PSEUDOCODE - Add export
export { OrbitPermissionService } from './orbit/permissions/OrbitPermissionService';
```

## Testing Requirements

### Manual Verification Steps
1. Navigate to Settings > Security tab
2. Verify "Fix Dangerous Permissions" card appears
3. Verify it lists critical permissions (Account.Transfer, etc.)
4. Click "Fix All Critical Permissions"
5. Verify proposals are created
6. Navigate to Governance tab
7. Verify EditPermission proposals appear
8. Vote and approve proposals
9. Refresh Security dashboard
10. Verify critical issues are resolved

### Backend Testing
```bash
# Test new backend method
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai remove_permission_from_operator_group '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai",
  variant { Account = variant { Transfer = variant { Any } } }
)'

# Verify proposal was created
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_proposals '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai"
)'
```

### Expected Results
- Security score improves from red to yellow/green
- "Non-admin groups can transfer treasury funds" issue resolved
- Operator group no longer has dangerous permissions
- All changes go through governance voting

## Playwright Testing

**See**: `PLAYWRIGHT_TESTING_GUIDE.md` section "For Plan Writers"

### Manual Browser Verification Workflow (BEFORE Playwright)
```bash
# 1. Deploy the changes
./deploy.sh --network ic

# 2. Open browser with console
npx playwright test --ui

# 3. Manual steps in browser:
# - Navigate to Settings > Security
# - Open browser console (F12)
# - Click "Fix All Critical Permissions"
# - Watch for console errors
# - Verify network requests succeed
# - Screenshot result

# 4. If errors found:
# - Fix the issue
# - Redeploy
# - Test again
```

### Test File Template
```javascript
// e2e/permission-fix.spec.ts
import { test, expect } from '@playwright/test';
import { createDataVerifier } from '../utils/testHelpers';

test.describe('Permission Fix Actions', () => {
  test('should remove dangerous permissions from Operator group', async ({ page }) => {
    const verifier = createDataVerifier(page);

    // Navigate to Settings > Security
    await page.goto('https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/dao/settings');

    // Wait for security dashboard to load
    await verifier.waitForReduxState(
      state => state.orbit?.securityData?.issues?.length > 0,
      'Security issues loaded'
    );

    // Verify permission fix card appears
    await expect(page.locator('text=Fix Dangerous Permissions')).toBeVisible();

    // Click fix all button
    await page.click('text=Fix All Critical Permissions');

    // Verify proposals created
    await verifier.waitForNetworkCall(
      url => url.includes('remove_permission_from_operator_group'),
      'Permission fix request'
    );

    // Check for console errors
    const errors = await verifier.getConsoleErrors();
    expect(errors).toHaveLength(0);
  });
});
```

### Iteration Loop
```bash
FOR i in 1..5; do
  npx playwright test e2e/permission-fix.spec.ts

  # Check console errors
  if [ -f test-results/console-errors.log ]; then
    echo "Console errors found, fixing..."
    # Fix based on error pattern
    ./deploy.sh --network ic
    sleep 60
  else
    echo "Test passed!"
    break
  fi
done
```

### Exit Criteria
- No console errors
- All network requests succeed (200/202)
- Redux state updates correctly
- UI reflects permission changes
- Proposals appear in Governance tab

## Commit & Handoff

This plan implements a critical security fix to remove dangerous permissions from the Operator group. The implementation:

1. Adds governance requirement to backend permission edits
2. Creates new permission service and UI component
3. Allows batch fixing of all critical permissions
4. Ensures all changes go through community voting

The solution follows the same pattern as AdminRemovalActions but for permissions instead of users.

**Estimated LOC**: +350 (new service and component)
**Risk**: Low - adds new functionality without breaking existing features
**Testing**: Manual verification + E2E tests provided