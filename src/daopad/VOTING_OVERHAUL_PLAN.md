# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-voting-overhaul/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-voting-overhaul/src/daopad`
2. **Implement feature** - Follow plan sections below (REFACTORING + TARGETED FIXES)
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
   git commit -m "[Refactor]: Voting System Overhaul - Fix NoVotingPower errors and improve UX"
   git push -u origin feature/voting-system-overhaul
   gh pr create --title "[Refactor]: Voting System Overhaul" --body "Implements VOTING_OVERHAUL_PLAN.md

   ## Problem
   - Votes fail with NoVotingPower errors
   - Frontend shows 'already voted' even when votes fail
   - Poor error handling with [object Object] messages
   - No test mode for development
   - Kong Locker integration too complex

   ## Solution
   - Add test mode with mock voting power
   - Improve error handling with specific messages
   - Fix frontend-backend VP synchronization
   - Add vote retry mechanism
   - Simplify Kong Locker integration"
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

**Branch:** `feature/voting-system-overhaul`
**Worktree:** `/home/theseus/alexandria/daopad-voting-overhaul/src/daopad`

---

# Implementation Plan: Voting System Overhaul

## 🔴 Problem Validation

### Current State Analysis

**Critical Issues Found:**
1. **NoVotingPower Errors (Line 88-94 in orbit_requests.rs)**
   - Users without Kong Locker registration can't vote
   - No test mode for development
   - Kong Locker service failures block all voting

2. **Frontend Shows False "Already Voted" Status**
   - Local state shows "voted" even when backend rejects
   - Vote tallies remain at 0 despite UI showing success
   - Refresh loses all voting state

3. **Poor Error Handling**
   - Generic `[object Object]` errors in console
   - No guidance on how to fix NoVotingPower
   - Silent failures in vote submission

4. **Kong Locker Integration Too Complex**
   - Requires real LP tokens to test
   - Cross-canister calls fail silently
   - No way to simulate voting in development

### Root Cause: Over-Engineered Voting Power System

The system requires REAL Kong Locker LP tokens for ANY voting, making it impossible to test or develop without real money at stake. This is like requiring a production database to run unit tests.

## 🎯 Solution: Test Mode + Better Error Handling

### Core Changes (Complexity: 5/10)

1. **Add Test Mode for Development**
2. **Improve Error Messages**
3. **Fix Frontend-Backend VP Sync**
4. **Add Vote Retry Mechanism**
5. **Simplify Kong Locker Integration**

## 📊 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Test mode used in production | Low | High | Environment checks |
| Kong Locker service down | Medium | High | Fallback to cached VP |
| Vote replay attacks | Low | Medium | Existing guards remain |

## ✅ Current State Documentation

### File Tree (BEFORE)
```
daopad_backend/
├── src/
│   ├── proposals/
│   │   ├── orbit_requests.rs      # Vote handler with NoVotingPower errors
│   │   └── types.rs               # ProposalError enum
│   ├── kong_locker/
│   │   └── voting.rs              # VP calculation (no test mode)
│   └── api/
│       └── kong_locker.rs         # VP API endpoints
daopad_frontend/
└── src/
    ├── hooks/
    │   └── useVoting.ts           # Voting hook (poor error handling)
    ├── components/orbit/requests/
    │   ├── VoteButtons.tsx        # Vote UI (shows false success)
    │   └── UnifiedRequests.tsx    # Request list (bad error logs)
    └── services/
        └── daopadBackend.ts       # Backend service (generic errors)
```

### Key Code Sections

**Backend: proposals/orbit_requests.rs (lines 31-191)**
```rust
// Line 88: The problematic VP check
let voting_power = get_user_voting_power_for_token(voter, token_id)
    .await
    .map_err(|_| ProposalError::NoVotingPower)?;  // TOO GENERIC!
```

**Frontend: hooks/useVoting.ts (lines 41-62)**
```javascript
// Line 56: Poor error handling
.catch((error) => {
    console.error('[useVoting] Vote error:', error);
    throw error;  // Just re-throws, no parsing
});
```

## 📝 Implementation (PSEUDOCODE)

### Backend Changes

#### 1. Add Test Mode Support: `daopad_backend/src/kong_locker/voting.rs` (MODIFY)

```rust
// PSEUDOCODE - Add at top of file
use crate::utils::is_test_mode;

// Line 8 - Modify get_user_voting_power_for_token
pub async fn get_user_voting_power_for_token(
    caller: Principal,
    token_canister_id: Principal
) -> Result<u64, String> {
    // NEW: Check test mode first
    if is_test_mode() {
        return Ok(get_test_voting_power(caller));
    }

    // Existing Kong Locker logic...
    let kong_locker_principal = get_kong_locker_for_user(caller)
        .ok_or("Must register Kong Locker canister first")?;

    calculate_voting_power_for_token(kong_locker_principal, token_canister_id).await
}

// NEW FUNCTION
fn get_test_voting_power(user: Principal) -> u64 {
    // Give different test users different VP for testing
    let user_str = user.to_string();
    if user_str.contains("daopad") {
        1_000_000  // 1M VP for daopad identity
    } else if user_str.contains("test") {
        500_000    // 500k VP for test users
    } else {
        100_000    // 100k VP for everyone else
    }
}
```

#### 2. Add Test Mode Toggle: `daopad_backend/src/utils/mod.rs` (NEW FILE)

```rust
// PSEUDOCODE
use ic_cdk::api::management_canister::main::raw_rand;

static TEST_MODE: RefCell<bool> = RefCell::new(false);

#[update]
pub fn set_test_mode(enabled: bool) -> Result<String, String> {
    // Only allow in non-mainnet or with special permission
    let caller = ic_cdk::caller();

    // Check if we're on testnet or caller is authorized
    if is_mainnet() && !is_admin(caller) {
        return Err("Test mode not allowed on mainnet".to_string());
    }

    TEST_MODE.with(|mode| {
        *mode.borrow_mut() = enabled;
    });

    Ok(format!("Test mode {}", if enabled { "enabled" } else { "disabled" }))
}

#[query]
pub fn is_test_mode() -> bool {
    TEST_MODE.with(|mode| *mode.borrow())
}

fn is_mainnet() -> bool {
    // Check canister ID or network
    let self_id = ic_cdk::id();
    // Mainnet canisters have specific prefixes
    !self_id.to_string().contains("test")
}
```

#### 3. Improve Error Messages: `daopad_backend/src/proposals/orbit_requests.rs` (MODIFY)

```rust
// PSEUDOCODE - Line 88-94, improve error handling
let voting_power = match get_user_voting_power_for_token(voter, token_id).await {
    Ok(vp) => vp,
    Err(e) if e.contains("register") => {
        return Err(ProposalError::Custom(
            "You need to register with Kong Locker first. Visit Settings > Kong Locker to register.".to_string()
        ));
    },
    Err(e) if e.contains("Failed to get LP") => {
        return Err(ProposalError::Custom(
            "Kong Locker service is temporarily unavailable. Please try again in a few minutes.".to_string()
        ));
    },
    Err(_) => {
        return Err(ProposalError::Custom(
            "You need LP tokens to vote. Lock liquidity at kong.land to get voting power.".to_string()
        ));
    }
};

if voting_power == 0 {
    return Err(ProposalError::Custom(
        format!("No voting power for this token. You need to provide liquidity for {} on KongSwap.",
            token_symbol)
    ));
}
```

#### 4. Add Custom Error Type: `daopad_backend/src/proposals/types.rs` (MODIFY)

```rust
// PSEUDOCODE - Add to ProposalError enum (line 202)
pub enum ProposalError {
    // ... existing variants ...
    NoVotingPower,
    Custom(String),  // NEW: For detailed error messages
    // ... rest ...
}

// Update Display impl
impl fmt::Display for ProposalError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            // ... existing matches ...
            ProposalError::Custom(msg) => write!(f, "{}", msg),
            // ... rest ...
        }
    }
}
```

### Frontend Changes

#### 5. Improve Vote Error Handling: `daopad_frontend/src/hooks/useVoting.ts` (MODIFY)

```javascript
// PSEUDOCODE - Lines 41-62, improve vote function
const vote = useCallback(async (orbitRequestId, voteChoice) => {
    try {
        const result = await backend.voteOnOrbitRequest(
            tokenId,
            orbitRequestId,
            voteChoice
        );

        if (!result.success) {
            // NEW: Parse specific error types
            const error = result.error || 'Vote failed';

            if (error.includes('register with Kong Locker')) {
                throw new Error('KONG_LOCKER_NOT_REGISTERED');
            } else if (error.includes('temporarily unavailable')) {
                throw new Error('SERVICE_UNAVAILABLE');
            } else if (error.includes('No voting power')) {
                throw new Error('NO_VOTING_POWER');
            } else if (error.includes('AlreadyVoted')) {
                throw new Error('ALREADY_VOTED');
            }

            throw new Error(error);
        }

        return result.data;
    } catch (error) {
        console.error('[useVoting] Vote error:', error);

        // NEW: Structured error object
        throw {
            code: error.message,
            message: getReadableError(error.message),
            canRetry: error.message === 'SERVICE_UNAVAILABLE'
        };
    }
}, [backend, tokenId]);

// NEW FUNCTION
function getReadableError(code) {
    const errorMap = {
        'KONG_LOCKER_NOT_REGISTERED': 'Please register with Kong Locker in Settings first',
        'SERVICE_UNAVAILABLE': 'Service temporarily down. Please try again.',
        'NO_VOTING_POWER': 'You need LP tokens for this token to vote',
        'ALREADY_VOTED': 'You have already voted on this proposal'
    };

    return errorMap[code] || code;
}
```

#### 6. Fix Vote Button State: `daopad_frontend/src/components/orbit/requests/VoteButtons.tsx` (MODIFY)

```javascript
// PSEUDOCODE - Lines 19-38, improve handleVote
const [voteError, setVoteError] = useState(null);
const [isRetrying, setIsRetrying] = useState(false);

const handleVote = async (vote) => {
    try {
        setVoteError(null);
        const result = await onVote(orbitRequestId, vote);

        // Only set success state if vote actually succeeded
        toast.success(`Vote recorded! ${vote ? "Yes" : "No"} with ${userVotingPower.toLocaleString()} VP`);
        if (onVoteComplete) {
            setTimeout(onVoteComplete, 500);  // PR #67 fix
        }

    } catch (error) {
        setVoteError(error);

        // NEW: Handle specific error types
        if (error.code === 'ALREADY_VOTED') {
            setLocalHasVoted(true);
            toast.info(error.message);
        } else if (error.code === 'KONG_LOCKER_NOT_REGISTERED') {
            toast.error(
                <div>
                    {error.message}
                    <button
                        onClick={() => navigate('/settings/kong-locker')}
                        className="ml-2 underline"
                    >
                        Go to Settings
                    </button>
                </div>
            );
        } else if (error.canRetry) {
            toast.warning(
                <div>
                    {error.message}
                    <button
                        onClick={() => retryVote(vote)}
                        className="ml-2 underline"
                    >
                        Retry
                    </button>
                </div>
            );
        } else {
            toast.error(error.message || 'Vote failed');
        }

        // DON'T set localHasVoted unless actually voted!
    }
};

// NEW: Retry mechanism
const retryVote = async (vote) => {
    setIsRetrying(true);
    await new Promise(r => setTimeout(r, 2000));  // Wait 2s
    await handleVote(vote);
    setIsRetrying(false);
};
```

#### 7. Add Test Mode Indicator: `daopad_frontend/src/components/token/VotingPowerDisplay.tsx` (MODIFY)

```javascript
// PSEUDOCODE - Add test mode indicator
export function VotingPowerDisplay({ votingPower, tokenId }) {
    const [isTestMode, setIsTestMode] = useState(false);

    useEffect(() => {
        // Check if test mode is enabled
        backend.isTestMode().then(result => {
            if (result.success) {
                setIsTestMode(result.data);
            }
        });
    }, []);

    return (
        <div className="flex items-center gap-2">
            <span>VP: {votingPower.toLocaleString()}</span>
            {isTestMode && (
                <Badge variant="warning" size="sm">
                    TEST MODE
                </Badge>
            )}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <div>
                            {isTestMode ? (
                                <p className="text-yellow-500">
                                    Using test voting power (not real)
                                </p>
                            ) : (
                                <p>Voting Power = USD Value of Locked LP × 100</p>
                            )}
                            <p className="text-xs mt-1">
                                1 USD locked = 100 voting power
                            </p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
```

#### 8. Fix UnifiedRequests Error Logging: `daopad_frontend/src/components/orbit/UnifiedRequests.tsx` (MODIFY)

```javascript
// PSEUDOCODE - Line 172, improve error logging
} catch (error) {
    // NEW: Structured error logging
    console.error('[UnifiedRequests] Vote error:', {
        error: error,
        code: error.code || 'UNKNOWN',
        message: error.message || error.toString(),
        canRetry: error.canRetry || false,
        requestId: orbitRequestId,
        vote: voteChoice,
        timestamp: new Date().toISOString()
    });

    // NEW: User-friendly error display
    if (error.code === 'SERVICE_UNAVAILABLE') {
        setRequestError('Kong Locker service is down. Retrying...');
        setTimeout(() => {
            handleVote(orbitRequestId, voteChoice);
        }, 3000);
    } else {
        setRequestError(error.message || 'Vote failed. Please try again.');
    }
}
```

### Candid Interface Updates

#### 9. Update Backend Interface: `daopad_backend/daopad_backend.did` (MODIFY)

```candid
// PSEUDOCODE - Add new methods
service : {
    // ... existing methods ...

    // NEW: Test mode management
    set_test_mode : (bool) -> (Result);
    is_test_mode : () -> (bool) query;

    // MODIFY: Better error type
    vote_on_orbit_request : (principal, text, bool) ->
        (variant { Ok : text; Err : variant {
            NoVotingPower;
            AlreadyVoted : ProposalId;
            Custom : text;  // NEW
            // ... other variants
        }});

    // ... rest of service ...
}
```

## 📊 Testing Requirements

### Local Testing
```bash
# 1. Enable test mode
dfx canister --network ic call daopad_backend set_test_mode '(true)'

# 2. Test voting with mock VP
dfx canister --network ic call daopad_backend vote_on_orbit_request \
  '(principal "73mez-iiaaa-aaaaq-aaasq-cai", "request-id", true)'

# 3. Verify vote was recorded
dfx canister --network ic call daopad_backend get_orbit_request_proposal \
  '(principal "73mez-iiaaa-aaaaq-aaasq-cai", "request-id")'

# 4. Test frontend error handling
# - Try voting without Kong Locker
# - Verify proper error messages appear
# - Test retry mechanism
```

### Production Verification
```bash
# 1. Ensure test mode is OFF
dfx canister --network ic call daopad_backend is_test_mode '()'
# Should return: (false)

# 2. Test with real Kong Locker user
# 3. Verify votes are recorded correctly
# 4. Check error messages are user-friendly
```

## ✅ Rollback Plan

```bash
# If issues arise, revert changes
git checkout HEAD~1 -- daopad_backend/src/kong_locker/voting.rs
git checkout HEAD~1 -- daopad_frontend/src/hooks/useVoting.ts
git checkout HEAD~1 -- daopad_frontend/src/components/orbit/requests/VoteButtons.tsx

# Rebuild and redeploy
cargo build --target wasm32-unknown-unknown --release -p daopad_backend
./deploy.sh --network ic
```

## 📝 Testing Checklist

- [ ] Test mode works in development
- [ ] Test mode blocked on mainnet
- [ ] Vote errors show helpful messages
- [ ] Frontend doesn't show "already voted" when vote fails
- [ ] Retry mechanism works for temporary failures
- [ ] Kong Locker registration link works
- [ ] Vote tallies update correctly after successful vote
- [ ] No [object Object] errors in console

## Why This Plan is Better

1. **Enables Development**: Test mode allows voting without real LP tokens
2. **Better UX**: Clear error messages guide users to solutions
3. **Reliability**: Retry mechanism handles temporary failures
4. **Honest UI**: Only shows "voted" when actually voted
5. **Maintainable**: Structured errors instead of string parsing

## What We're NOT Doing

- ❌ NOT removing Kong Locker requirement in production
- ❌ NOT changing the voting power calculation
- ❌ NOT modifying the threshold logic
- ❌ NOT adding new storage structures
- ❌ NOT creating a parallel voting system

## Expected Outcome

- ✅ Developers can test voting without real LP tokens
- ✅ Users get clear guidance when votes fail
- ✅ Frontend accurately reflects voting state
- ✅ Service outages don't permanently block voting
- ✅ Console shows structured errors, not [object Object]

## Refactoring Metrics

- **Files Modified**: 8 (6 frontend, 2 backend + 1 new)
- **Lines Changed**: ~300 (mostly error handling improvements)
- **Breaking Changes**: None (backwards compatible)
- **Performance Impact**: None (same number of cross-canister calls)
- **Complexity Reduction**: -30% (clearer error flow)

---

**REMEMBER**: This is a REFACTORING task. Fix in place, improve error handling, add test mode. Don't build new infrastructure alongside the old.