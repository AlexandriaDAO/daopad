# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-invoice-subaccount/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-invoice-subaccount/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Backend changes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release -p daopad_invoices --locked
     cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
     candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > daopad_backend/daopad_backend.did
     ./deploy.sh --network ic --backend-only
     cp -r src/declarations/daopad_backend/* daopad_frontend/src/declarations/daopad_backend/
     ```
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Manual Testing** (MANDATORY - Playwright incompatible with ICP auth):
   - Test complete flow in browser (see Testing section below)
   - Verify console has no errors
   - Confirm token transfer to correct subaccount
5. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "feat: Add ICRC1 subaccount support for invoice payments

   - Update Invoice struct with Orbit account fields
   - Add ICRC1 address parsing helper
   - Implement treasury account validation
   - Replace custom principal with Orbit account selector
   - Update token transfer to use subaccounts
   - Validate account can receive token before invoice creation

   Testing: Manual verification with ckUSDT transfer to subaccount"
   git push -u origin feature/invoice-orbit-subaccount
   gh pr create --title "feat: Enable Invoice Payments to Orbit Treasury Subaccounts" --body "$(cat <<'EOF'
## Summary
- Replaces direct principal transfers with Orbit treasury account support
- Enables proper ICRC1 subaccount transfers for ICP and ckUSDT
- Adds upfront validation to ensure account can receive selected token
- Implements manual account selection dropdown with balance display

## Changes
- **Backend**: Updated Invoice struct, added address parsing, subaccount transfer support
- **Frontend**: Treasury account dropdown, ICRC1 address parsing, validation

## Test plan
- [x] Create invoice selecting Orbit treasury account
- [x] Complete Stripe payment
- [x] Verify webhook transfers to correct subaccount
- [x] Check treasury balance increases in Orbit Station
- [x] Test with both ICP and ckUSDT
- [x] Verify validation rejects incompatible token/account combinations

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
   ```
6. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view --json comments,reviews --jq '.reviews[] | select(.state=="CHANGES_REQUESTED") | .body'`
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

**Branch:** `feature/invoice-orbit-subaccount`
**Worktree:** `/home/theseus/alexandria/daopad-invoice-subaccount/src/daopad`

---

# Implementation Plan: Invoice Orbit Subaccount Support

## Problem Statement

**Current Behavior:**
Invoices transfer tokens to raw Principal addresses without subaccount support:
```rust
let to_account = Account {
    owner: receiver,
    subaccount: None,  // ❌ Always None
};
```

**User's Requirement:**
Send ckUSDT to Orbit treasury accounts using proper ICRC1 subaccounts:
```bash
dfx canister --network ic call cngnf-vqaaa-aaaar-qag4q-cai icrc1_transfer '(record {
    to = record {
      owner = principal "6ulqe-qaaaa-aaaac-a4w3a-cai";
      subaccount = opt blob "\88\6e\e6\6a\28\97\4c\4c\86\c8\a0\bc\e7\eb\87\06\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00";
    };
    amount = 1000000;
})'
```

**Design Decisions (User-Confirmed):**
1. **Orbit accounts only** - Remove custom principal option
2. **Manual dropdown** - User selects from treasury accounts list
3. **Upfront validation** - Verify account can receive token before invoice creation

---

## Current State Analysis

### File Tree (Before Changes)

```
daopad/
├── daopad_invoices/                    # Invoice canister (handles Stripe webhooks)
│   └── src/
│       ├── types.rs                    # Invoice struct definition
│       ├── stripe.rs                   # Invoice creation, Stripe integration
│       ├── swap.rs                     # Token transfer logic (ICP/ckUSDT)
│       └── storage.rs                  # Invoice storage
│
├── daopad_backend/                     # Main backend (creates Orbit requests)
│   └── src/
│       └── api/
│           └── orbit_accounts.rs       # Treasury account queries
│
└── daopad_frontend/
    ├── src/
    │   ├── pages/
    │   │   └── InvoicesPage.tsx        # Invoice list page
    │   ├── components/invoices/
    │   │   └── CreateInvoice.tsx       # Invoice creation dialog
    │   └── services/backend/
    │       ├── invoices/
    │       │   └── InvoiceService.ts   # Invoice backend interface
    │       └── accounts/
    │           └── AccountService.ts   # Treasury account interface
    └── src/declarations/               # Generated candid types
```

### Current Invoice Data Structure

**File**: `daopad_invoices/src/types.rs:7-18`
```rust
pub struct Invoice {
    pub id: String,                  // Stripe payment link ID
    pub url: String,                 // Stripe payment link URL
    pub fiat: u64,                   // Fiat amount in cents (USD)
    pub crypto: u64,                 // Crypto amount (set after payment)
    pub collateral: Collateral,      // ICP or ckUSDT
    pub description: String,         // Invoice description
    pub created_at: u64,             // Timestamp
    pub status: InvoiceStatus,       // Paid, Unpaid, Inactive
    pub receiver: Principal,         // ❌ Raw principal (no subaccount)
}
```

### Current Transfer Logic

**File**: `daopad_invoices/src/swap.rs:15-23`
```rust
pub async fn transfer_icp(invoice: &Invoice, amount: u64) -> Result<u64, String> {
    let to_account = Account {
        owner: invoice.receiver,
        subaccount: None,  // ❌ Problem: No subaccount support
    };
    // ... transfer logic
}
```

**File**: `daopad_invoices/src/swap.rs:54-62`
```rust
pub async fn transfer_ckusdt(invoice: &Invoice, amount: u64) -> Result<u64, String> {
    let to_account = Account {
        owner: invoice.receiver,
        subaccount: None,  // ❌ Problem: No subaccount support
    };
    // ... transfer logic
}
```

### Existing Orbit Integration

**File**: `daopad_backend/src/api/orbit_accounts.rs:10-35`
- `get_treasury_accounts_with_balances()` - Available, returns accounts with addresses
- Account structure includes `addresses: Vec<AccountAddress>` with ICRC1 format

**Account Address Structure** (from Orbit Station):
```rust
pub struct AccountAddress {
    pub address: String,  // Format: "principal.subaccount-hex"
    pub format: String,   // "icrc1_account"
}
```

**Example Address**: `"fec7w-zyaaa-aaaaa-qaffq-cai.886ee66a28974c4c86c8a0bce7eb8706000000000000000000000000000000000000"`
- Principal: `fec7w-zyaaa-aaaaa-qaffq-cai`
- Subaccount: `\88\6e\e6\6a\28\97\4c\4c\86\c8\a0\bc\e7\eb\87\06\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00` (32 bytes)

---

## Implementation Steps

### 1. Backend: Update Invoice Data Structure

**File**: `daopad_invoices/src/types.rs`

**Change**:
```rust
// PSEUDOCODE - Remove old field, add new fields

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Invoice {
    pub id: String,
    pub url: String,
    pub fiat: u64,
    pub crypto: u64,
    pub collateral: Collateral,
    pub description: String,
    pub created_at: u64,
    pub status: InvoiceStatus,

    // ❌ REMOVE: pub receiver: Principal,

    // ✅ ADD: Orbit treasury account fields
    pub orbit_account_id: String,          // UUID of Orbit account
    pub treasury_owner: Principal,          // Principal from ICRC1 address
    pub treasury_subaccount: Option<Vec<u8>>,  // 32-byte subaccount or None
}
```

**Migration Note**: Existing invoices in storage will fail to deserialize. Since invoices are ephemeral (Stripe links), we can:
- Option A: Clear invoice storage on deploy
- Option B: Add migration to set default values for new fields
- **Recommended**: Option A (simpler, no user impact)

---

### 2. Backend: Add ICRC1 Address Parsing Helper

**File**: `daopad_backend/src/api/orbit_accounts.rs`

**Add**:
```rust
// PSEUDOCODE - Add helper function at bottom of file

/// Parses ICRC1 address format: "principal.subaccount-hex"
/// Returns (Principal, Option<[u8; 32]>)
pub fn parse_icrc1_address(address: &str) -> Result<(Principal, Option<Vec<u8>>), String> {
    // Split on '.'
    let parts: Vec<&str> = address.split('.').collect();

    // Parse principal from first part
    let principal = Principal::from_text(parts[0])
        .map_err(|e| format!("Invalid principal: {}", e))?;

    // If no subaccount part, return None
    if parts.len() == 1 {
        return Ok((principal, None));
    }

    // Parse subaccount hex string
    let subaccount_hex = parts[1];
    let subaccount_bytes = hex::decode(subaccount_hex)
        .map_err(|e| format!("Invalid subaccount hex: {}", e))?;

    // Validate length is exactly 32 bytes
    if subaccount_bytes.len() != 32 {
        return Err(format!(
            "Subaccount must be 32 bytes, got {}",
            subaccount_bytes.len()
        ));
    }

    Ok((principal, Some(subaccount_bytes)))
}

// Add hex dependency to Cargo.toml if not present
```

---

### 3. Backend: Add Treasury Account Validation

**File**: `daopad_backend/src/api/orbit_accounts.rs`

**Add**:
```rust
// PSEUDOCODE - Add validation helper

#[update]
async fn validate_treasury_account_for_token(
    orbit_station_id: Principal,
    account_id: String,
    token_symbol: String,  // "ICP" or "ckUSDT"
) -> Result<String, String> {
    // Call Orbit Station to get account details
    let request = GetAccountInput {
        account_id: account_id.clone(),
    };

    let result: Result<(GetAccountResponse,), _> =
        ic_cdk::call(orbit_station_id, "get_account", (request,)).await;

    let response = result
        .map_err(|e| format!("Failed to call Orbit: {:?}", e))?
        .0;

    let account = response.account;

    // Check if account has an asset matching the token
    let has_token = account.assets.iter().any(|asset| {
        asset.symbol == token_symbol
    });

    if !has_token {
        return Err(format!(
            "Account '{}' does not support {} token",
            account.name, token_symbol
        ));
    }

    // Find the ICRC1 address for this account
    let icrc1_address = account.addresses.iter()
        .find(|addr| addr.format == "icrc1_account")
        .ok_or("No ICRC1 address found for account")?;

    // Return the address for frontend to use
    Ok(icrc1_address.address.clone())
}
```

---

### 4. Backend: Update Invoice Creation

**File**: `daopad_invoices/src/stripe.rs`

**Change**:
```rust
// PSEUDOCODE - Update function signature and logic

#[ic_cdk::update]
async fn create_invoice(
    amount_in_cents: u64,
    collateral_name: String,        // "ICP" or "ckUSDT"
    description: Option<String>,
    // ❌ REMOVE: receiver: Principal,
    // ✅ ADD: Orbit treasury fields
    orbit_station_id: Principal,    // e.g., fec7w-zyaaa-aaaaa-qaffq-cai
    orbit_account_id: String,       // UUID from frontend
    orbit_account_address: String,  // ICRC1 address from frontend
) -> String {
    // Validate caller is not anonymous
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return "Error: Anonymous caller not allowed".to_string();
    }

    // Parse the ICRC1 address into principal + subaccount
    let (treasury_owner, treasury_subaccount) =
        match parse_icrc1_address(&orbit_account_address) {
            Ok(parsed) => parsed,
            Err(e) => return format!("Error parsing address: {}", e),
        };

    // Create collateral enum
    let collateral = match collateral_name.as_str() {
        "ICP" => Collateral::ICP,
        "ckUSDT" => Collateral::ckUSDT,
        _ => return "Error: Invalid collateral".to_string(),
    };

    // Generate idempotency key for Stripe
    let idempotency_key = format!("invoice-{}-{}", caller, ic_cdk::api::time());

    // Create Stripe payment link (existing logic)
    let payment_link_url = create_stripe_payment_link(
        amount_in_cents,
        &description.unwrap_or_default(),
        &idempotency_key,
    ).await?;

    // Store invoice with new fields
    let invoice = Invoice {
        id: extract_payment_link_id(&payment_link_url),
        url: payment_link_url,
        fiat: amount_in_cents,
        crypto: 0,  // Set after payment
        collateral,
        description: description.unwrap_or_default(),
        created_at: ic_cdk::api::time(),
        status: InvoiceStatus::Unpaid,
        orbit_account_id,
        treasury_owner,
        treasury_subaccount,
    };

    // Store in canister storage
    INVOICES.with(|invoices| {
        invoices.borrow_mut().insert(invoice.id.clone(), invoice.clone());
    });

    invoice.url
}
```

---

### 5. Backend: Update Token Transfer Logic

**File**: `daopad_invoices/src/swap.rs`

**Change**:
```rust
// PSEUDOCODE - Update transfer functions to use subaccount

pub async fn transfer_icp(invoice: &Invoice, amount: u64) -> Result<u64, String> {
    // ✅ Use treasury fields instead of receiver
    let to_account = Account {
        owner: invoice.treasury_owner,
        subaccount: invoice.treasury_subaccount.clone(),
    };

    // Rest of transfer logic remains the same
    let transfer_args = TransferArg {
        from_subaccount: None,
        to: to_account,
        fee: None,
        created_at_time: Some(ic_cdk::api::time()),
        memo: None,
        amount: Nat::from(amount),
    };

    let result: Result<(Result<Nat, TransferError>,), _> = ic_cdk::call(
        ICP_LEDGER_CANISTER_ID,
        "icrc1_transfer",
        (transfer_args,)
    ).await;

    // Handle result...
}

pub async fn transfer_ckusdt(invoice: &Invoice, amount: u64) -> Result<u64, String> {
    // ✅ Use treasury fields instead of receiver
    let to_account = Account {
        owner: invoice.treasury_owner,
        subaccount: invoice.treasury_subaccount.clone(),
    };

    // Rest of transfer logic remains the same
    let transfer_args = TransferArg {
        from_subaccount: None,
        to: to_account,
        fee: None,
        created_at_time: Some(ic_cdk::api::time()),
        memo: None,
        amount: Nat::from(amount),
    };

    let result: Result<(Result<Nat, TransferError>,), _> = ic_cdk::call(
        CKUSDT_LEDGER_CANISTER_ID,
        "icrc1_transfer",
        (transfer_args,)
    ).await;

    // Handle result...
}
```

---

### 6. Frontend: Add ICRC1 Address Parser Utility

**File**: `daopad_frontend/src/utils/icrc1.ts` (NEW FILE)

```typescript
// PSEUDOCODE - Create new utility file

import { Principal } from '@dfinity/principal';

export interface Icrc1Account {
  owner: Principal;
  subaccount: Uint8Array | null;
}

/**
 * Parses ICRC1 address format: "principal.subaccount-hex"
 * Example: "fec7w-zyaaa-aaaaa-qaffq-cai.886ee66a28974c4c86c8a0bce7eb8706000000000000000000000000000000000000"
 */
export function parseIcrc1Address(address: string): Icrc1Account {
  const parts = address.split('.');

  const owner = Principal.fromText(parts[0]);

  if (parts.length === 1) {
    return { owner, subaccount: null };
  }

  // Convert hex string to Uint8Array
  const subaccount = hexToBytes(parts[1]);

  if (subaccount.length !== 32) {
    throw new Error(`Subaccount must be 32 bytes, got ${subaccount.length}`);
  }

  return { owner, subaccount };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Formats subaccount bytes for display
 */
export function formatSubaccount(subaccount: Uint8Array | null): string {
  if (!subaccount) return 'Default (no subaccount)';

  // Convert to hex
  const hex = Array.from(subaccount)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Show first 8 and last 8 chars
  return `${hex.substring(0, 8)}...${hex.substring(hex.length - 8)}`;
}
```

---

### 7. Frontend: Update CreateInvoice Dialog

**File**: `daopad_frontend/src/components/invoices/CreateInvoice.tsx`

**Major Changes**:
```typescript
// PSEUDOCODE - Update component

import { useState, useEffect } from 'react';
import { invoiceService } from '../../services/backend/invoices/InvoiceService';
import { accountService } from '../../services/backend/accounts/AccountService';
import { parseIcrc1Address, formatSubaccount } from '../../utils/icrc1';

export function CreateInvoice({ open, onClose, onSuccess }) {
  // Existing state
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [collateral, setCollateral] = useState<'ICP' | 'ckUSDT'>('ICP');

  // ❌ REMOVE: const [receiverPrincipal, setReceiverPrincipal] = useState('');

  // ✅ ADD: Treasury account state
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch treasury accounts on mount
  useEffect(() => {
    if (open) {
      fetchTreasuryAccounts();
    }
  }, [open]);

  async function fetchTreasuryAccounts() {
    setLoadingAccounts(true);
    try {
      const accounts = await accountService.getTreasuryAccountsWithBalances();
      setTreasuryAccounts(accounts);

      // Auto-select first account that has the selected token
      const compatible = accounts.find(acc =>
        acc.assets.some(asset => asset.symbol === collateral)
      );
      if (compatible) {
        setSelectedAccountId(compatible.id);
      }
    } catch (err) {
      setError('Failed to load treasury accounts');
      console.error(err);
    } finally {
      setLoadingAccounts(false);
    }
  }

  // Filter accounts by selected token
  const compatibleAccounts = treasuryAccounts.filter(account =>
    account.assets.some(asset => asset.symbol === collateral)
  );

  // When collateral changes, reset selection to compatible account
  useEffect(() => {
    const compatible = compatibleAccounts[0];
    if (compatible) {
      setSelectedAccountId(compatible.id);
    }
  }, [collateral]);

  async function handleSubmit() {
    // Validation
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!selectedAccountId) {
      setError('Please select a treasury account');
      return;
    }

    // Find selected account
    const selectedAccount = treasuryAccounts.find(
      acc => acc.id === selectedAccountId
    );

    if (!selectedAccount) {
      setError('Selected account not found');
      return;
    }

    // Get ICRC1 address for the account
    const icrc1Address = selectedAccount.addresses.find(
      addr => addr.format === 'icrc1_account'
    );

    if (!icrc1Address) {
      setError('No ICRC1 address found for account');
      return;
    }

    try {
      // Call backend to create invoice
      const amountInCents = Math.round(amount * 100);
      const invoiceUrl = await invoiceService.createInvoice(
        amountInCents,
        collateral,
        description || null,
        ORBIT_STATION_ID,  // From config
        selectedAccountId,
        icrc1Address.address
      );

      onSuccess(invoiceUrl);
      onClose();
    } catch (err) {
      setError('Failed to create invoice: ' + err.message);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create Invoice</DialogTitle>
      <DialogContent>
        {/* Amount input with preset buttons */}
        <FormControl fullWidth margin="normal">
          <FormLabel>Amount (USD)</FormLabel>
          <Box display="flex" gap={1} mb={2}>
            {[10, 25, 50, 100, 250, 500].map(preset => (
              <Button
                key={preset}
                variant={amount === preset ? 'contained' : 'outlined'}
                onClick={() => setAmount(preset)}
              >
                ${preset}
              </Button>
            ))}
          </Box>
          <TextField
            type="number"
            value={amount}
            onChange={e => setAmount(parseFloat(e.target.value))}
            placeholder="Or enter custom amount"
          />
        </FormControl>

        {/* Description (optional) */}
        <TextField
          fullWidth
          margin="normal"
          label="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        {/* Collateral selection */}
        <FormControl fullWidth margin="normal">
          <FormLabel>Payment Token</FormLabel>
          <RadioGroup value={collateral} onChange={e => setCollateral(e.target.value as any)}>
            <FormControlLabel value="ICP" control={<Radio />} label="ICP" />
            <FormControlLabel value="ckUSDT" control={<Radio />} label="ckUSDT" />
          </RadioGroup>
        </FormControl>

        {/* ✅ ADD: Treasury account selector */}
        <FormControl fullWidth margin="normal">
          <FormLabel>Treasury Account</FormLabel>
          {loadingAccounts ? (
            <CircularProgress size={24} />
          ) : compatibleAccounts.length === 0 ? (
            <Alert severity="warning">
              No treasury accounts found that support {collateral}.
              Please configure an account in Orbit Station first.
            </Alert>
          ) : (
            <>
              <Select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
              >
                {compatibleAccounts.map(account => {
                  const asset = account.assets.find(a => a.symbol === collateral);
                  const icrc1Addr = account.addresses.find(a => a.format === 'icrc1_account');
                  const parsed = parseIcrc1Address(icrc1Addr.address);

                  return (
                    <MenuItem key={account.id} value={account.id}>
                      <Box>
                        <Typography variant="body1">
                          {account.name} - {asset?.balance || 0} {collateral}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {parsed.owner.toText()} | {formatSubaccount(parsed.subaccount)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
              <FormHelperText>
                Payments will be sent to this account's ICRC1 address
              </FormHelperText>
            </>
          )}
        </FormControl>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loadingAccounts || compatibleAccounts.length === 0}
        >
          Create Invoice
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

### 8. Frontend: Update InvoiceService

**File**: `daopad_frontend/src/services/backend/invoices/InvoiceService.ts`

**Change**:
```typescript
// PSEUDOCODE - Update method signature

class InvoiceService {
  async createInvoice(
    amountInCents: number,
    collateral: 'ICP' | 'ckUSDT',
    description: string | null,
    // ❌ REMOVE: receiverPrincipal: Principal,
    // ✅ ADD: Orbit treasury fields
    orbitStationId: Principal,
    orbitAccountId: string,
    orbitAccountAddress: string
  ): Promise<string> {
    const actor = await this.getInvoiceActor();

    const result = await actor.create_invoice(
      BigInt(amountInCents),
      collateral,
      description ? [description] : [],
      orbitStationId,
      orbitAccountId,
      orbitAccountAddress
    );

    return result;
  }

  // Other methods remain unchanged...
}

export const invoiceService = new InvoiceService();
```

---

### 9. Add Hex Dependency (If Needed)

**File**: `daopad_backend/Cargo.toml`

Check if `hex` crate is already present. If not, add:
```toml
[dependencies]
hex = "0.4"
```

---

## Testing Strategy

### ⚠️ Playwright Limitation

**From CLAUDE.md**: "Playwright tests only work in areas that don't require authentication. Don't even try because Playwright's not compatible with ICP Auth."

Since invoice creation requires authentication, **we cannot use Playwright for E2E tests**. Testing must be manual.

---

### Manual Testing Workflow (MANDATORY)

**Prerequisites:**
- DFX identity with admin access to test station
- Test Orbit Station: `fec7w-zyaaa-aaaaa-qaffq-cai`
- Treasury account configured with both ICP and ckUSDT
- Stripe test mode enabled

**Test Scenario 1: ckUSDT Invoice to Subaccount**

1. **Deploy changes**:
   ```bash
   ./deploy.sh --network ic
   ```

2. **Open frontend in browser**:
   ```bash
   open https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io/invoices
   ```

3. **Create invoice**:
   - Click "Create Invoice"
   - Select amount: $10
   - Select token: ckUSDT
   - Select treasury account from dropdown
   - Verify account shows: principal + subaccount preview
   - Click "Create Invoice"
   - Copy invoice URL

4. **Check console for errors**:
   ```bash
   # Open browser console (F12)
   # Look for:
   # - No "actor.method_name is not a function" errors
   # - No candid decode errors
   # - Invoice creation success message
   ```

5. **Complete Stripe payment**:
   - Open invoice URL in new tab
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete payment

6. **Verify webhook transfer**:
   ```bash
   # Check invoice canister logs for transfer
   dfx canister --network ic logs daopad_invoices

   # Should see:
   # - Payment webhook received
   # - ckUSDT transfer initiated
   # - Transfer to: owner=<treasury_principal>, subaccount=<32_bytes>
   # - Transfer success
   ```

7. **Verify Orbit balance increased**:
   ```bash
   # Open Orbit Station UI
   open https://fec7w-zyaaa-aaaaa-qaffq-cai.icp0.io

   # Navigate to Accounts > Treasury
   # Check ckUSDT balance increased by ~$10 worth
   ```

**Test Scenario 2: ICP Invoice to Subaccount**

Repeat steps 1-7 with:
- Token: ICP
- Amount: $25
- Verify ICP balance increases (note: ICP price fluctuates)

**Test Scenario 3: Validation Checks**

1. **No compatible accounts**:
   - Temporarily remove ckUSDT from all accounts in Orbit
   - Try to create ckUSDT invoice
   - Should see: "No treasury accounts found that support ckUSDT"

2. **Invalid address handling**:
   - Manually test `parseIcrc1Address()` with malformed addresses
   - Backend should reject with clear error message

**Test Scenario 4: Migration (Existing Invoices)**

1. **Before deploy**: Check existing invoices display correctly
2. **After deploy**:
   - Old invoices may fail to load (expected)
   - Option: Clear invoice storage before deploy
   - Or: Add migration code to handle old format

---

### Console Error Checklist

**After deploying, check browser console for:**

❌ **Critical Errors (Must Fix)**:
- `actor.create_invoice is not a function` → Declaration sync issue
- `candid decode error` → Type mismatch between frontend/backend
- `Principal.fromText failed` → Invalid address format
- `Failed to call Orbit` → Permission or network issue

⚠️ **Warnings (Investigate)**:
- `No ICRC1 address found` → Account misconfigured in Orbit
- `Subaccount length mismatch` → Parsing error

✅ **Expected Success Messages**:
- `Invoice created successfully`
- `Payment received, transferring tokens...`
- `Transfer completed: block_height <number>`

---

### Backend Testing (Before Frontend)

**Test ICRC1 address parsing**:
```bash
# From DFX with test station
dfx canister --network ic call daopad_backend get_treasury_accounts_with_balances '(principal "fec7w-zyaaa-aaaaa-qaffq-cai")'

# Should return accounts with addresses like:
# addresses = vec {
#   record {
#     format = "icrc1_account";
#     address = "fec7w-zyaaa-aaaaa-qaffq-cai.886ee66a28974c4c86c8a0bce7eb8706000000000000000000000000000000000000";
#   }
# }

# Test validation
dfx canister --network ic call daopad_backend validate_treasury_account_for_token '(
  principal "fec7w-zyaaa-aaaaa-qaffq-cai",
  "<account_uuid>",
  "ckUSDT"
)'

# Should return the ICRC1 address if valid
# Should error if account doesn't have ckUSDT
```

---

### Exit Criteria (When to Stop Testing)

✅ **Success - Ready to merge**:
- [x] ckUSDT invoice created successfully
- [x] ICP invoice created successfully
- [x] Console shows no errors
- [x] Payment webhook executes without errors
- [x] Token transferred to correct subaccount (verified in logs)
- [x] Orbit Station balance increased correctly
- [x] Validation prevents incompatible token/account combinations
- [x] UI shows account names, balances, and subaccount previews

❌ **Failure - Keep iterating**:
- Console errors present
- Transfer goes to wrong address
- Payment completes but no transfer happens
- Frontend shows stale data

---

## Migration & Rollback Plan

### Migration Strategy

**Problem**: Existing `Invoice` structs in storage use old format (just `receiver: Principal`)

**Solution Options**:

**Option A: Clear Invoice Storage (Recommended)**
```rust
// Add to deployment script or init function
#[init]
fn init() {
    INVOICES.with(|invoices| {
        invoices.borrow_mut().clear();
    });
}
```

**Pros**: Simple, no migration code
**Cons**: Loses existing invoice data (acceptable since Stripe links expire)

**Option B: Graceful Migration**
```rust
// Add optional fields initially
pub struct Invoice {
    // ... existing fields
    pub orbit_account_id: Option<String>,
    pub treasury_owner: Option<Principal>,
    pub treasury_subaccount: Option<Vec<u8>>,
}

// In transfer logic, handle old invoices
pub async fn transfer_icp(invoice: &Invoice, amount: u64) -> Result<u64, String> {
    let to_account = if let Some(owner) = invoice.treasury_owner {
        // New format
        Account {
            owner,
            subaccount: invoice.treasury_subaccount.clone(),
        }
    } else {
        // Old format (fallback)
        Account {
            owner: invoice.receiver,  // Would need to keep this field too
            subaccount: None,
        }
    };
    // ...
}
```

**Pros**: Backward compatible
**Cons**: More complex, maintains legacy code path

**Decision**: Use Option A (clear storage) since invoices are ephemeral.

### Rollback Plan

If critical bug discovered after deploy:

1. **Immediate**: Revert frontend to previous version
   ```bash
   git revert <commit_hash>
   ./deploy.sh --network ic --frontend-only
   ```

2. **Backend revert** (if needed):
   ```bash
   # Redeploy previous wasm
   dfx deploy daopad_backend --network ic --mode reinstall --upgrade-unchanged
   ```

3. **Data loss**: Acceptable (invoices are Stripe links, recreatable)

---

## Dependencies

### New Dependencies (If Missing)

**Backend** (`daopad_backend/Cargo.toml`):
```toml
[dependencies]
hex = "0.4"  # For hex decoding subaccounts
```

**Frontend** (likely already present):
- `@dfinity/principal` - For Principal parsing
- `@dfinity/agent` - For actor communication

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Subaccount parsing error | Medium | High | Extensive validation on both frontend and backend |
| Old invoices break | High | Low | Clear storage on deploy (invoices are ephemeral) |
| Stripe webhook fails with new format | Low | High | Test webhook thoroughly before production |
| Declaration sync missed | Medium | High | Document sync step in plan, verify after deploy |
| Wrong subaccount used | Low | Critical | Parse address correctly, add test scenario |
| Orbit permission denied | Low | Medium | Use test station with confirmed admin access |

---

## Post-Deployment Checklist

After merging PR and deploying to production:

- [ ] Monitor invoice canister logs for errors
- [ ] Check first production invoice completes successfully
- [ ] Verify Orbit Station balances update correctly
- [ ] Document new invoice creation process for users
- [ ] Update any user-facing documentation
- [ ] Consider adding Grafana metrics for invoice success rate

---

## Future Enhancements (Out of Scope)

- Add invoice expiration (Stripe links already expire)
- Support multiple tokens per invoice
- Add refund functionality
- Email notifications on payment completion
- Invoice templates for recurring payments
- Analytics dashboard for invoice metrics

---

## Questions for Implementer (Self-Check)

Before marking this plan complete, verify:

1. ✅ Did I verify worktree isolation?
2. ✅ Did I test ICRC1 address parsing with real addresses?
3. ✅ Did I manually test invoice creation in browser?
4. ✅ Did I verify token transferred to correct subaccount?
5. ✅ Did I check console for errors?
6. ✅ Did I sync declarations after backend changes?
7. ✅ Did I create the PR with proper title and body?
8. ✅ Did I push commits before creating PR?

**If any answer is NO, the plan is not complete. Fix before opening PR.**

---

## Summary

This plan transforms invoice payments from simple principal transfers to proper Orbit treasury integration with ICRC1 subaccounts. The implementation:

1. **Removes**: Custom principal input (breaking change, intentional)
2. **Adds**: Orbit account selector with validation
3. **Enables**: Proper subaccount transfers for ICP and ckUSDT
4. **Validates**: Upfront checking of token compatibility
5. **Tests**: Manual browser verification (Playwright incompatible)

The key insight is that Orbit Station already provides ICRC1 addresses in the correct format - we just need to parse them correctly and use them in transfers.

**Example End-to-End Flow**:
```
User: Create $10 ckUSDT invoice
  ↓
Frontend: Fetch treasury accounts, show dropdown
  ↓
User: Select "Operations Treasury" (has ckUSDT)
  ↓
Frontend: Extract ICRC1 address "6ulqe-qaaaa-aaaac-a4w3a-cai.886ee66a..."
  ↓
Backend: Parse into principal + 32-byte subaccount
  ↓
Backend: Create Stripe link, store invoice with parsed fields
  ↓
User: Pay via Stripe
  ↓
Webhook: Transfer 1000000 ckUSDT to Account {
  owner: 6ulqe-qaaaa-aaaac-a4w3a-cai,
  subaccount: Some([0x88, 0x6e, 0xe6, ...])
}
  ↓
Success: Orbit Station balance increases ✅
```

---

**Autonomous Agent: You are now cleared to implement. Follow the orchestrator workflow at the top of this document. Do not skip PR creation. Good luck! 🚀**
