# Wallet Balance UI Implementation Plan

## Overview
Add a dynamic wallet balance component to the ICPI frontend that displays user token balances for all tracked tokens (current: ICPI, ckUSDT, ALEX, ZERO, KONG, BOB). The component must be dynamic - automatically adapting when new tokens are added to or removed from the index.

## Key Constraint
The list of tracked tokens is defined in `src/icpi_backend/src/types.rs:18-23` (`TrackedToken::ALL`). When tokens are added/removed from this array, the UI must automatically reflect these changes without code modifications.

---

## Part 1: Backend - Verification Required

### Step 1: Test Backend Endpoints

**BEFORE implementing frontend**, verify endpoints work on mainnet:

```bash
# Test 1: Get tracked tokens
dfx canister call --network ic icpi_backend get_tracked_tokens

# Expected output: (vec { "ALEX"; "ZERO"; "KONG"; "BOB" })

# Test 2: Get token metadata
dfx canister call --network ic icpi_backend get_token_metadata

# Expected output: (variant { Ok = vec { record { symbol = "ALEX"; canister_id = principal "ysy5f-..."; decimals = 8 : nat8 }; ... } })
```

If tests fail, fix backend before proceeding.

### Existing Endpoints
These endpoints already exist and provide the necessary data:

**`get_tracked_tokens()` - src/icpi_backend/src/lib.rs:185**
```rust
// Returns Vec<String> of all tracked token symbols
// Example: ["ALEX", "ZERO", "KONG", "BOB"]
```

**`get_token_metadata()` - src/icpi_backend/src/lib.rs:191**
```rust
// Returns Result<Vec<TokenMetadata>, String>
// TokenMetadata structure (src/icpi_backend/src/types.rs):
pub struct TokenMetadata {
    pub symbol: String,           // "ALEX"
    pub canister_id: Principal,   // ysy5f-2qaaa-aaaap-qkmmq-cai
    pub decimals: u8,             // 8
}
```

**Note:** ckUSDT and ICPI are NOT in TrackedToken enum (they're special - ICPI is the index token itself, ckUSDT is the rebalancing currency). We need to handle these separately.

### Shared Constants

**Create: `src/icpi_frontend/src/constants/canisters.ts`** (NEW FILE)

```typescript
// Canister IDs used across the application
// Source: src/icpi_backend/src/types.rs:302
export const CKUSDT_CANISTER_ID = 'cngnf-vqaaa-aaaar-qag4q-cai'

// ICPI canister ID will be imported from declarations
export { canisterId as ICPI_CANISTER_ID } from 'declarations/icpi_backend'
```

---

## Part 2: Frontend Hook - Query All User Balances

### File: `src/icpi_frontend/src/hooks/useICPI.ts`

Add a new hook that queries user balances for ALL tokens (tracked tokens + ICPI + ckUSDT):

```typescript
// Add after useTrackedTokens hook

export interface UserTokenBalance {
  symbol: string
  balance: string          // Raw balance as string (e.g., "100000000" for 1.0 with 8 decimals)
  balanceFormatted: number // Human-readable (e.g., 1.0)
  decimals: number
  canisterId: string
  usdValue?: number        // USD value if price is available
  error?: string           // Error message if balance query failed
}

export const useUserWalletBalances = (
  actor: Actor | null,
  userPrincipal: string | null,
  agent: HttpAgent | null
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.USER_WALLET_BALANCES, userPrincipal],
    queryFn: async () => {
      if (!actor || !userPrincipal || !agent) {
        throw new Error('Actor, principal, or agent not initialized')
      }

      // STEP 1: Get token metadata for all tracked tokens
      const tokenMetadataResult = await actor.get_token_metadata()

      if (!('Ok' in tokenMetadataResult)) {
        throw new Error('Err' in tokenMetadataResult ? tokenMetadataResult.Err : 'Failed to fetch token metadata')
      }
      const trackedTokensMetadata = tokenMetadataResult.Ok

      // STEP 2: Add ICPI token metadata (the index token itself)
      import { ICPI_CANISTER_ID, CKUSDT_CANISTER_ID } from '@/constants/canisters'

      const icpiMetadata = {
        symbol: 'ICPI',
        canister_id: Principal.fromText(ICPI_CANISTER_ID),
        decimals: 8, // ICPI has 8 decimals (defined in src/icpi_backend/src/icpi_token.rs:7)
      }

      // STEP 3: Add ckUSDT metadata (special case - rebalancing currency)
      const ckusdtMetadata = {
        symbol: 'ckUSDT',
        canister_id: Principal.fromText(CKUSDT_CANISTER_ID),
        decimals: 6, // ckUSDT has 6 decimals
      }

      // STEP 4: Combine all token metadata
      const allTokensMetadata = [
        icpiMetadata,
        ckusdtMetadata,
        ...trackedTokensMetadata,
      ]

      // STEP 5: Query balances for all tokens in parallel
      const balancePromises = allTokensMetadata.map(async (token: any) => {
        try {
          // Create ICRC1 actor for each token canister
          const tokenActor = Actor.createActor(ICRC1_IDL, {
            agent,
            canisterId: token.canister_id.toString(),
          })

          // Query balance using ICRC1 standard
          const balance = await tokenActor.icrc1_balance_of({
            owner: Principal.fromText(userPrincipal),
            subaccount: [],
          })

          // Convert to human-readable format
          const balanceStr = balance.toString()
          const decimals = token.decimals
          const balanceFormatted = Number(balanceStr) / Math.pow(10, decimals)

          return {
            symbol: token.symbol,
            balance: balanceStr,
            balanceFormatted,
            decimals,
            canisterId: token.canister_id.toString(),
          }
        } catch (error) {
          console.error(`Error querying ${token.symbol} balance:`, error)
          // Return zero balance with error flag so UI can show warning
          return {
            symbol: token.symbol,
            balance: '0',
            balanceFormatted: 0,
            decimals: token.decimals,
            canisterId: token.canister_id.toString(),
            error: error instanceof Error ? error.message : 'Query failed',
          }
        }
      })

      // STEP 6: Await all balance queries
      const balances = await Promise.all(balancePromises)

      // STEP 7: Get USD values from index state
      let enrichedBalances = balances
      try {
        const indexStateResult = await actor.get_index_state()

        if ('Ok' in indexStateResult) {
          const indexState = indexStateResult.Ok

          // Enrich balances with USD values
          enrichedBalances = balances.map(balance => {
            // Find matching position for USD value
            const position = indexState.current_positions.find((p: any) => {
              const tokenKey = Object.keys(p.token)[0]
              return tokenKey === balance.symbol
            })

            if (position && balance.balanceFormatted > 0) {
              // Calculate USD value: (user_balance / canister_balance) * canister_usd_value
              const canisterBalance = Number(position.balance) / Math.pow(10, balance.decimals)
              if (canisterBalance > 0) {
                const pricePerToken = position.usd_value / canisterBalance
                const usdValue = balance.balanceFormatted * pricePerToken
                return { ...balance, usdValue }
              }
            }

            return balance
          })
        }
      } catch (error) {
        console.error('Failed to fetch USD values:', error)
        // Continue without USD values if this fails
      }

      // STEP 8: Sort by USD value (highest first), then by balance
      enrichedBalances.sort((a, b) => {
        const aValue = a.usdValue || 0
        const bValue = b.usdValue || 0
        if (aValue !== bValue) return bValue - aValue
        return b.balanceFormatted - a.balanceFormatted
      })

      return enrichedBalances as UserTokenBalance[]
    },
    enabled: !!actor && !!userPrincipal && !!agent,
    refetchInterval: 30_000, // Refetch every 30 seconds (query calls are fast)
    staleTime: 15_000,       // Consider stale after 15 seconds
    retry: 2,
  })
}

// Add to QUERY_KEYS constant at top of file:
// Find the existing QUERY_KEYS object and add this line:
export const QUERY_KEYS = {
  // ... existing keys remain unchanged ...
  USER_WALLET_BALANCES: 'userWalletBalances', // ADD THIS LINE ONLY
} as const
```

---

## Part 3: Wallet Balance Component

### File: `src/icpi_frontend/src/components/WalletBalances.tsx` (NEW FILE)

Create a new component to display user wallet balances:

```typescript
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { formatNumber } from '@/lib/utils'
import { Copy, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { UserTokenBalance } from '@/hooks/useICPI'

interface WalletBalancesProps {
  balances: UserTokenBalance[]
  userPrincipal: string
  isLoading?: boolean
  onSendToken?: (symbol: string) => void
}

export const WalletBalances: React.FC<WalletBalancesProps> = ({
  balances,
  userPrincipal,
  isLoading = false,
  onSendToken,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copiedAddress, setCopiedAddress] = useState(false)

  // PSEUDOCODE: Handle copy principal to clipboard
  const handleCopyPrincipal = async () => {
    try {
      await navigator.clipboard.writeText(userPrincipal)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Categorize balances into groups (already sorted by USD value)
  const indexToken = balances.find(b => b.symbol === 'ICPI')
  const stablecoin = balances.find(b => b.symbol === 'ckUSDT')
  const portfolioTokens = balances.filter(b =>
    b.symbol !== 'ICPI' && b.symbol !== 'ckUSDT'
  )

  // Calculate total portfolio value
  const totalValue = balances.reduce((sum, b) => sum + (b.usdValue || 0), 0)

  return (
    <Card className="border-[#1f1f1f]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">WALLET</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-3">
          {/* SECTION 1: Receive Address */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#666666] uppercase">Your Address</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPrincipal}
                className="h-5 px-1 text-[10px]"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copiedAddress ? 'COPIED' : 'COPY'}
              </Button>
            </div>
            <div className="text-[10px] font-mono text-white bg-[#0a0a0a] p-1.5 border border-[#1f1f1f] break-all">
              {userPrincipal}
            </div>
            <p className="text-[9px] text-[#666666]">
              Share this address to receive any ICRC1 token
            </p>
          </div>

          <div className="border-t border-[#1f1f1f] pt-2" />

          {/* SECTION 2: Index Token (ICPI) */}
          {indexToken && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#666666] uppercase">Index Token</span>
              </div>
              <TokenBalanceRow
                token={indexToken}
                onSend={onSendToken}
                highlight={true}
              />
            </div>
          )}

          {/* SECTION 3: Stablecoin (ckUSDT) */}
          {stablecoin && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#666666] uppercase">Stablecoin</span>
              </div>
              <TokenBalanceRow
                token={stablecoin}
                onSend={onSendToken}
              />
            </div>
          )}

          {/* SECTION 4: Portfolio Tokens (Dynamic) */}
          {portfolioTokens.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#666666] uppercase">Portfolio Tokens</span>
                <Badge variant="secondary" className="h-4 text-[9px]">
                  {portfolioTokens.length}
                </Badge>
              </div>
              <div className="space-y-0.5">
                {portfolioTokens.map(token => (
                  <TokenBalanceRow
                    key={token.symbol}
                    token={token}
                    onSend={onSendToken}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: Total Value */}
          <div className="border-t border-[#1f1f1f] pt-2" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#666666] uppercase">Total Value</span>
            <span className="text-sm text-white font-mono">
              {totalValue > 0 ? `$${formatNumber(totalValue)}` : '—'}
            </span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4">
              <span className="text-[10px] text-[#666666]">Loading balances...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && balances.length === 0 && (
            <div className="text-center py-4">
              <span className="text-[10px] text-[#666666]">Your wallet is empty</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// PSEUDOCODE: Individual token balance row component
interface TokenBalanceRowProps {
  token: UserTokenBalance
  onSend?: (symbol: string) => void
  highlight?: boolean
}

const TokenBalanceRow: React.FC<TokenBalanceRowProps> = ({
  token,
  onSend,
  highlight = false
}) => {
  return (
    <div className={`flex items-center justify-between p-1.5 ${highlight ? 'bg-[#0a0a0a] border border-[#1f1f1f]' : ''}`}>
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${highlight ? 'text-[#00FF41]' : 'text-white'}`}>
            {token.symbol}
          </span>
          {token.error && (
            <span className="text-[9px] text-[#FF0055]" title={token.error}>
              ⚠ Error
            </span>
          )}
        </div>
        {token.usdValue !== undefined && token.usdValue > 0 && (
          <span className="text-[9px] text-[#666666]">
            ${formatNumber(token.usdValue)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-white">
          {formatNumber(token.balanceFormatted)}
        </span>

        {onSend && token.balanceFormatted > 0 && !token.error && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSend(token.symbol)}
            className="h-5 w-5 p-0"
            title="Send"
          >
            <Send className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## Part 4: Send Token Modal Component

### File: `src/icpi_frontend/src/components/SendTokenModal.tsx` (NEW FILE)

```typescript
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Loader2, X } from 'lucide-react'
import { UserTokenBalance } from '@/hooks/useICPI'

interface SendTokenModalProps {
  token: UserTokenBalance
  onClose: () => void
  onSend: (recipient: string, amount: string) => Promise<void>
}

export const SendTokenModal: React.FC<SendTokenModalProps> = ({
  token,
  onClose,
  onSend,
}) => {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  // PSEUDOCODE: Validate and send token
  const handleSend = async () => {
    setError('')

    // Validation
    if (!recipient.trim()) {
      setError('Recipient address is required')
      return
    }

    // Validate principal format using @dfinity/principal
    try {
      Principal.fromText(recipient)
    } catch {
      setError('Invalid principal format')
      return
    }

    // Warn if sending to self (but allow it)
    if (recipient === userPrincipal) {
      // Could add a warning banner here
      console.warn('User is sending tokens to themselves')
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Invalid amount')
      return
    }

    if (parseFloat(amount) > token.balanceFormatted) {
      setError('Insufficient balance')
      return
    }

    setIsSending(true)
    try {
      await onSend(recipient, amount)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Transfer failed')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="w-full max-w-md border-[#1f1f1f]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">SEND {token.symbol}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3 space-y-3">
          {/* Balance Display */}
          <div className="bg-[#0a0a0a] p-2 border border-[#1f1f1f]">
            <div className="flex justify-between text-xs">
              <span className="text-[#666666]">Available Balance</span>
              <span className="text-white font-mono">
                {token.balanceFormatted.toFixed(6)} {token.symbol}
              </span>
            </div>
          </div>

          {/* Recipient Input */}
          <div className="space-y-1">
            <Label className="text-xs">Recipient Address</Label>
            <Input
              type="text"
              placeholder="xxxxx-xxxxx-xxxxx-xxxxx-cai"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-[9px] text-[#666666]">
              Enter the recipient's principal ID
            </p>
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <Label className="text-xs">Amount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 text-right font-mono"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAmount(token.balanceFormatted.toString())}
                className="px-2"
              >
                MAX
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-2 py-1 bg-[#FF005520] border border-[#FF0055] text-[#FF0055] text-xs">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-1"
              disabled={isSending}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              className="flex-1"
              disabled={isSending || !recipient || !amount}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  SENDING...
                </>
              ) : (
                'SEND'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Part 5: ICRC1 Transfer Hook

### File: `src/icpi_frontend/src/hooks/useICPI.ts`

Add a mutation hook for transferring tokens:

```typescript
// Add after useManualRebalance hook (after line 238)

export const useTransferToken = (agent: HttpAgent | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tokenCanisterId,
      recipient,
      amount,
      decimals
    }: {
      tokenCanisterId: string
      recipient: string
      amount: string
      decimals: number
    }) => {
      if (!agent) throw new Error('Agent not initialized')

      // STEP 1: Create actor for the token canister
      const tokenActor = Actor.createActor(ICRC1_IDL, {
        agent,
        canisterId: tokenCanisterId,
      })

      // STEP 2: Query fee from token canister
      const fee = await tokenActor.icrc1_fee()

      // STEP 3: Convert amount to raw units using string manipulation
      // to avoid floating-point precision loss
      const [wholePart, decimalPart = ''] = amount.split('.')
      const paddedDecimal = decimalPart.padEnd(decimals, '0').slice(0, decimals)
      const amountStr = wholePart + paddedDecimal
      const amountRaw = BigInt(amountStr)

      // STEP 4: Prepare transfer args (ICRC1 standard)
      const transferArgs = {
        to: {
          owner: Principal.fromText(recipient),
          subaccount: [],
        },
        amount: amountRaw,
        fee: [fee], // Always include fee
        memo: [], // Optional
        from_subaccount: [], // Optional
        created_at_time: [], // Optional
      }

      // STEP 5: Call icrc1_transfer
      const result = await tokenActor.icrc1_transfer(transferArgs)

      // STEP 6: Handle Result type (Ok/Err)
      if ('Ok' in result) {
        return result.Ok // Block index
      } else if ('Err' in result) {
        // Parse error for user-friendly message
        const errMsg = JSON.stringify(result.Err)
        if (errMsg.includes('InsufficientFunds')) {
          throw new Error('Insufficient funds (remember to account for transfer fee)')
        } else if (errMsg.includes('BadFee')) {
          throw new Error('Incorrect fee amount')
        }
        throw new Error(`Transfer failed: ${errMsg}`)
      }
      throw new Error('Unexpected result format')
    },
    onSuccess: () => {
      // Invalidate user wallet balances to trigger refresh
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_WALLET_BALANCES] })
    },
  })
}

// Extend existing ICRC1_IDL to include transfer and fee methods:
// Find the existing ICRC1_IDL definition and update it to:
const ICRC1_IDL = ({ IDL }: any) => {
  // Existing Account type
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  })

  // ADD: TransferArg type
  const TransferArg = IDL.Record({
    to: Account,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
  })

  // ADD: TransferError type
  const TransferError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    TemporarilyUnavailable: IDL.Null,
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
  })

  // ADD: TransferResult type
  const TransferResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: TransferError,
  })

  return IDL.Service({
    // Existing method
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
    // ADD: New methods
    icrc1_fee: IDL.Func([], [IDL.Nat], ['query']),
    icrc1_transfer: IDL.Func([TransferArg], [TransferResult], []),
  })
}
```

---

## Part 6: Integrate into App.tsx

### File: `src/icpi_frontend/src/App.tsx`

Update to use the new wallet balance features:

```typescript
// STEP 1: Import new hooks and components (add to imports at top)
import {
  useUserWalletBalances,
  useTransferToken,
} from './hooks/useICPI'
import { WalletBalances } from './components/WalletBalances'
import { SendTokenModal } from './components/SendTokenModal'

// STEP 2: Add state for send modal (around line 46)
const [sendModalToken, setSendModalToken] = useState<UserTokenBalance | null>(null)

// STEP 3: Initialize new hooks (around line 56)
const { data: walletBalances, isLoading: balancesLoading } = useUserWalletBalances(
  actor,
  principal,
  agent
)
const transferMutation = useTransferToken(agent)

// STEP 4: Handle send token action
const handleSendToken = (symbol: string) => {
  const token = walletBalances?.find(t => t.symbol === symbol)
  if (token) {
    setSendModalToken(token)
  }
}

const handleTransferSubmit = async (recipient: string, amount: string) => {
  if (!sendModalToken) return

  await transferMutation.mutateAsync({
    tokenCanisterId: sendModalToken.canisterId,
    recipient,
    amount,
    decimals: sendModalToken.decimals,
  })
}

// STEP 5: Update loading condition to include wallet balances (around line 193)
if (!indexState || !actualAllocations || !rebalancerStatus || balancesLoading) {
  console.log('Loading state:', {
    indexState: !!indexState,
    actualAllocations: !!actualAllocations,
    rebalancerStatus: !!rebalancerStatus,
    balancesLoading,
  })
  return <FullPageSkeleton />
}
```

---

## Part 7: Integrate into Dashboard.tsx

### File: `src/icpi_frontend/src/components/Dashboard.tsx`

Update Dashboard to display wallet balances:

```typescript
// STEP 1: Add to imports
import { WalletBalances } from './WalletBalances'
import { UserTokenBalance } from '@/hooks/useICPI'

// STEP 2: Update DashboardProps interface
interface DashboardProps {
  principal: string
  balance: string
  tvl: number
  portfolioData: any
  allocations: any[]
  rebalancingData: any
  userICPIBalance: number
  userUSDTBalance: number
  tokenHoldings: any[]
  walletBalances: UserTokenBalance[]  // ADD THIS
  onDisconnect: () => void
  onMint: (amount: number) => Promise<void>
  onRedeem: (amount: number) => Promise<void>
  onManualRebalance: () => Promise<void>
  onToggleAutoRebalance: (enabled: boolean) => void
  onSendToken: (symbol: string) => void  // ADD THIS
}

// STEP 3: Update component destructuring
export const Dashboard: React.FC<DashboardProps> = ({
  principal,
  balance,
  tvl,
  portfolioData,
  allocations,
  rebalancingData,
  userICPIBalance,
  userUSDTBalance,
  tokenHoldings,
  walletBalances,  // ADD THIS
  onDisconnect,
  onMint,
  onRedeem,
  onManualRebalance,
  onToggleAutoRebalance,
  onSendToken,  // ADD THIS
}) => {

// STEP 4: Update layout - change from 2-column to 3-column
// Add responsive breakpoints: 1 col (mobile) -> 2 col (tablet) -> 3 col (desktop)
return (
  <div className="min-h-screen bg-[#000000]">
    <DashboardHeader
      principal={principal}
      balance={balance}
      tvl={tvl}
      totalSupply={portfolioData.totalSupply}
      indexPrice={portfolioData.indexPrice}
      apy={portfolioData.apy}
      onDisconnect={onDisconnect}
    />

    <div className="container py-3 px-3">
      {/* Responsive grid: 1 col (mobile) -> 2 col (tablet) -> 3 col (desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_400px_350px] gap-3">
        {/* Left: Portfolio Dashboard */}
        <PortfolioDashboard
          portfolioData={portfolioData}
          allocations={allocations}
          rebalancingData={rebalancingData}
          onManualRebalance={onManualRebalance}
          onToggleAutoRebalance={onToggleAutoRebalance}
        />

        {/* Middle: Trade Interface */}
        <TradeInterface
          currentTVL={tvl}
          currentSupply={portfolioData.totalSupply}
          userUSDTBalance={userUSDTBalance}
          onMint={onMint}
          userICPIBalance={userICPIBalance}
          tokenHoldings={tokenHoldings}
          onRedeem={onRedeem}
        />

        {/* Right: Wallet Balances (NEW) */}
        <WalletBalances
          balances={walletBalances}
          userPrincipal={principal}
          onSendToken={onSendToken}
        />
      </div>
    </div>
  </div>
)
```

---

## Part 8: Pass Props from App.tsx to Dashboard

### File: `src/icpi_frontend/src/App.tsx`

Update Dashboard invocation to pass wallet balances and send handler:

```typescript
return (
  <Dashboard
    principal={principal}
    balance={balance}
    tvl={portfolioData.portfolioValue}
    portfolioData={portfolioData}
    allocations={actualAllocations}
    rebalancingData={rebalancingData}
    userICPIBalance={parseFloat(balance)}
    userUSDTBalance={userBalance?.ckusdt || 0}
    tokenHoldings={holdings || []}
    walletBalances={walletBalances || []}  // ADD THIS
    onDisconnect={logout}
    onMint={handleMint}
    onRedeem={handleRedeem}
    onManualRebalance={handleManualRebalance}
    onToggleAutoRebalance={setAutoRebalance}
    onSendToken={handleSendToken}  // ADD THIS
  />
)

// And render the send modal conditionally (add after Dashboard closing tag)
{sendModalToken && (
  <SendTokenModal
    token={sendModalToken}
    onClose={() => setSendModalToken(null)}
    onSend={handleTransferSubmit}
  />
)}
```

---

## Key Design Decisions

### 1. **Dynamic Token List**
- Backend: `TrackedToken::ALL` in `src/icpi_backend/src/types.rs:18-23` is the single source of truth
- Frontend: Queries `get_token_metadata()` to get current list + metadata
- When tokens are added to backend, frontend automatically picks them up (no code changes needed)

### 2. **Special Tokens**
- **ICPI**: Index token itself (not in TrackedToken enum) - always included
- **ckUSDT**: Rebalancing currency (not in TrackedToken enum) - always included
- **Portfolio Tokens**: Dynamic based on `TrackedToken::ALL`

### 3. **Balance Queries**
- Use ICRC1 standard `icrc1_balance_of` (query calls - fast)
- Query all balances in parallel using `Promise.all()`
- Graceful degradation: If one token fails, show 0 balance instead of failing entire UI

### 4. **Token Transfers**
- Use ICRC1 standard `icrc1_transfer` (update calls)
- Frontend handles amount conversion (human → raw units)
- Simple validation (principal format, balance check)

### 5. **USD Values** (Optional Enhancement)
- Can add by calling `get_index_state()` for token prices
- Match token symbols to get current prices
- Calculate: `balance * price / 10^decimals`

---

## Testing Checklist

### Backend Testing
```bash
# Already implemented - just verify
dfx canister call --network ic icpi_backend get_tracked_tokens
dfx canister call --network ic icpi_backend get_token_metadata
```

### Frontend Testing (After Implementation)
1. **Load wallet balances**: Should see ICPI, ckUSDT, ALEX, ZERO, KONG, BOB
2. **Copy address**: Click copy button, paste in another app
3. **Send token**: Click send button on token with balance > 0
4. **Transfer validation**: Try invalid principal, insufficient balance
5. **Balance refresh**: After sending, balances should update within 30 seconds
6. **Dynamic tokens**: If backend adds new token, frontend should show it without code changes

---

## File Summary

### New Files to Create
1. `src/icpi_frontend/src/components/WalletBalances.tsx` - Main wallet display component
2. `src/icpi_frontend/src/components/SendTokenModal.tsx` - Send token modal

### Files to Modify
1. `src/icpi_frontend/src/hooks/useICPI.ts` - Add `useUserWalletBalances` and `useTransferToken` hooks
2. `src/icpi_frontend/src/App.tsx` - Integrate wallet balances and send modal
3. `src/icpi_frontend/src/components/Dashboard.tsx` - Add wallet column to layout

### Files Referenced (No Changes)
1. `src/icpi_backend/src/types.rs` - TrackedToken definition
2. `src/icpi_backend/src/lib.rs` - Backend endpoints
3. `src/icpi_backend/src/balance_tracker.rs` - Balance query logic

---

## Responsive Design Notes

The grid layout adapts across screen sizes:
- **Mobile (<768px)**: 1 column - Portfolio → Trade → Wallet (vertical stack)
- **Tablet (768px-1024px)**: 2 columns - Portfolio + Trade on left, Wallet on right
- **Desktop (>1024px)**: 3 columns - Portfolio (left) | Trade (middle) | Wallet (right)

Alternative consideration: Could make wallet a collapsible section in the header instead of a sidebar, which would free up horizontal space for the main dashboard.

---

## Additional Enhancements (Future)

1. **Refresh Button**: Add manual refresh button to wallet component
2. **Transaction History**: Query recent ICRC1 transfers and display in wallet
3. **QR Code**: Generate QR code for user principal for easy receiving
4. **Transaction Confirmations**: Toast notifications after successful transfers
5. **Batch Transfers**: Send multiple tokens to same recipient in one flow
6. **Address Book**: Save frequently used principals

---

## Plan Review Fixes Applied

This plan has been updated to address all critical, medium, and low priority issues identified in review:

### Critical Issues Fixed ✅

1. **Placeholder Variables** - Replaced with proper imports from `declarations/icpi_backend` and shared constants file
2. **Principal Validation** - Now uses `Principal.fromText()` with try/catch instead of weak string check
3. **Decimal Precision** - Fixed using string manipulation to avoid floating-point loss: `const [wholePart, decimalPart] = amount.split('.')`
4. **Fee Handling** - Added explicit fee query: `const fee = await tokenActor.icrc1_fee()` and always include in transfer
5. **ICRC1 IDL Mismatch** - Changed to extend existing IDL instead of replacing, added `icrc1_fee` and `icrc1_transfer` methods

### Medium Priority Fixes ✅

6. **USD Values Implemented** - Added USD value calculation in `useUserWalletBalances` by fetching prices from `get_index_state()`, calculating per-token USD values, and displaying total portfolio value. Tokens are sorted by USD value (highest first).
7. **Error State Added** - `UserTokenBalance` interface now includes optional `error?: string` field, displayed with warning icon in UI
8. **Canister ID Constants** - Created shared `constants/canisters.ts` file importing from backend source
9. **Query Keys** - Changed to show adding `USER_WALLET_BALANCES` only, not replacing entire object
10. **Backend Verification** - Added testing step at beginning of Part 1 with `dfx canister call` commands

### Low Priority Improvements ✅

11. **Token Ordering** - Added sort by balance descending: `balances.sort((a, b) => b.balanceFormatted - a.balanceFormatted)`
12. **Self-Transfer Warning** - Added console warning when user sends to own principal
13. **Empty State Message** - Changed to "Your wallet is empty" instead of "No balances found"
14. **Better Error Messages** - Parse transfer errors for user-friendly messages (InsufficientFunds, BadFee, etc.)

### Documentation Improvements ✅

15. **Line Number References** - Changed to descriptive references ("Add after useTrackedTokens hook" instead of "after line 403")
16. **Responsive Breakpoints** - Updated grid to use 3 breakpoints: `grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_400px_350px]`
17. **Agent Initialization** - Agent is created in App.tsx during authentication and passed down as prop

### What's Still TODO (Outside Scope)

- Transaction history display
- Fee estimation preview before transfer
- Pagination if token list grows beyond 15 tokens
- Toast notifications for successful transfers
- Error boundary wrapper around WalletBalances component
- QR code generation for receiving tokens
- Address book for frequently used principals
