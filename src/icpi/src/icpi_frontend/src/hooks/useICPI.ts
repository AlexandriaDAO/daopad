import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { ICPI_CANISTER_ID, CKUSDT_CANISTER_ID } from '../constants/canisters'

// Types
export interface UserTokenBalance {
  symbol: string
  balance: string          // Raw balance as string
  balanceFormatted: number // Human-readable
  decimals: number
  canisterId: string
  usdValue?: number        // USD value if price is available
  error?: string           // Error message if balance query failed
}

// Define the query keys
export const QUERY_KEYS = {
  INDEX_STATE: 'indexState',
  REBALANCER_STATUS: 'rebalancerStatus',
  TVL_DATA: 'tvlData',
  USER_BALANCE: 'userBalance',
  HOLDINGS: 'holdings',
  ALLOCATION: 'allocation',
  TOKEN_METADATA: 'tokenMetadata',
  ACTUAL_ALLOCATIONS: 'actualAllocations',
  TRACKED_TOKENS: 'trackedTokens',
  USER_WALLET_BALANCES: 'userWalletBalances',
} as const

// ICRC1 IDL for balance queries and transfers
const ICRC1_IDL = ({ IDL }: any) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  })

  // Transfer types
  const TransferArg = IDL.Record({
    to: Account,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
  })

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

  const TransferResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: TransferError,
  })

  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
    icrc1_fee: IDL.Func([], [IDL.Nat], ['query']),
    icrc1_transfer: IDL.Func([TransferArg], [TransferResult], []),
  })
}

// Custom hooks for ICPI data
export const useIndexState = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.INDEX_STATE],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      console.log('Calling get_index_state...')

      // First test if backend is responding
      try {
        const testResult = await actor.get_simple_test()
        console.log('Backend query test successful:', testResult)
      } catch (testError) {
        console.error('Backend query test failed:', testError)
      }

      // Test if update calls work at all
      try {
        const updateTest = await actor.test_simple_update()
        console.log('Backend update test successful:', updateTest)
      } catch (updateError) {
        console.error('Backend update test failed:', updateError)
      }

      try {
        // Add a timeout wrapper for the call (40s to accommodate inter-canister calls)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error('Timeout fired after 40s')
            reject(new Error('get_index_state call timed out after 40s'))
          }, 40000)
        })

        console.log('Starting Promise.race...')
        const callPromise = actor.get_index_state()
        console.log('Call promise created')

        const result = await Promise.race([
          callPromise,
          timeoutPromise
        ])
        console.log('get_index_state result:', result)

        // Handle Result type - unwrap Ok/Err variant
        if ('Ok' in result) {
          return result.Ok
        } else if ('Err' in result) {
          console.error('get_index_state returned error:', result.Err)
          throw new Error(result.Err)
        }
        throw new Error('Unexpected result format')
      } catch (error) {
        console.error('get_index_state call failed:', error)
        throw error
      }
    },
    enabled: !!actor,
    refetchInterval: 2 * 60_000, // Refetch every 2 minutes
    staleTime: 60_000, // 1 minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error: any) => console.error('useIndexState error:', error),
  })
}

export const useRebalancerStatus = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.REBALANCER_STATUS],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      console.log('Calling get_rebalancer_status...')

      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.error('get_rebalancer_status timed out after 30s')
          reject(new Error('get_rebalancer_status call timed out after 30s'))
        }, 30000)
      })

      const result = await Promise.race([
        actor.get_rebalancer_status(),
        timeoutPromise
      ])

      console.log('get_rebalancer_status result:', result)
      return result
    },
    enabled: !!actor,
    refetchInterval: 60_000, // Refetch every 1 minute
    staleTime: 30_000,
    retry: 2, // Only retry twice on failure
    retryDelay: 1000, // Wait 1s between retries
    onError: (error: any) => console.error('useRebalancerStatus error:', error),
  })
}

export const useTVLData = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TVL_DATA],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      const result = await actor.get_tvl_summary()

      // Handle Result type - unwrap Ok/Err variant
      if ('Ok' in result) {
        return result.Ok
      } else if ('Err' in result) {
        throw new Error(result.Err)
      }
      throw new Error('Unexpected result format')
    },
    enabled: !!actor,
    staleTime: 10 * 60_000, // 10 minutes
    refetchInterval: 5 * 60_000, // Refetch every 5 minutes
  })
}

export const useUserBalance = (actor: Actor | null, principal: string | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.USER_BALANCE, principal],
    queryFn: async () => {
      if (!actor || !principal) throw new Error('Actor or principal not available')
      const icpiBalance = await actor.balance_of({ owner: principal, subaccount: [] })
      // Also fetch ckUSDT balance if needed
      return {
        icpi: icpiBalance,
        ckusdt: 0, // This would come from ckUSDT canister
      }
    },
    enabled: !!actor && !!principal,
    refetchInterval: 2 * 60_000, // Refetch every 2 minutes
    staleTime: 60_000,
  })
}

export const useHoldings = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.HOLDINGS],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      return await actor.get_token_holdings()
    },
    enabled: !!actor,
    refetchInterval: 2 * 60_000, // Refetch every 2 minutes
    staleTime: 60_000,
  })
}

export const useAllocation = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ALLOCATION],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      const stateResult = await actor.get_index_state()
      const tvlResult = await actor.get_tvl_summary()

      // Unwrap Result types
      if (!('Ok' in stateResult) || !('Ok' in tvlResult)) {
        throw new Error(
          'Err' in stateResult ? stateResult.Err :
          'Err' in tvlResult ? tvlResult.Err :
          'Failed to fetch allocation data'
        )
      }

      // Calculate allocations based on state and TVL
      return calculateAllocations(stateResult.Ok, tvlResult.Ok)
    },
    enabled: !!actor,
    refetchInterval: 2 * 60_000, // Refetch every 2 minutes
    staleTime: 60_000,
  })
}

// Mutation hooks
export const useMintICPI = (actor: Actor | null) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!actor) throw new Error('Actor not initialized')
      return await actor.mint_icpi({ amount: BigInt(amount * 1e6) }) // Convert to e6 decimals
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INDEX_STATE] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_BALANCE] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOLDINGS] })
    },
  })
}

export const useRedeemICPI = (actor: Actor | null) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!actor) throw new Error('Actor not initialized')
      return await actor.redeem_icpi({ amount: BigInt(amount * 1e8) }) // ICPI has 8 decimals
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INDEX_STATE] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_BALANCE] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOLDINGS] })
    },
  })
}

export const useManualRebalance = (actor: Actor | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      return await actor.execute_rebalance()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INDEX_STATE] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REBALANCER_STATUS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOLDINGS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALLOCATION] })
    },
  })
}

// Hook for transferring ICRC1 tokens
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

// Get token metadata from backend
export const useTokenMetadata = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TOKEN_METADATA],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      const result = await actor.get_token_metadata()

      // Handle Result type - unwrap Ok/Err variant
      if ('Ok' in result) {
        return result.Ok
      } else if ('Err' in result) {
        throw new Error(result.Err)
      }
      throw new Error('Unexpected result format')
    },
    enabled: !!actor,
    staleTime: Infinity, // Token metadata never changes
  })
}

// Query token balances directly from token canisters
export const useActualAllocations = (
  icpiActor: Actor | null,
  icpiCanisterId: string | null,
  agent: HttpAgent | null
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ACTUAL_ALLOCATIONS, icpiCanisterId],
    queryFn: async () => {
      if (!icpiActor || !icpiActor || !icpiCanisterId || !agent) {
        throw new Error('Actor, canister ID, or agent not initialized')
      }

      console.log('useActualAllocations: Fetching metadata and TVL...')

      // Get token metadata and TVL data
      const [tokenMetadataResult, tvlDataResult] = await Promise.all([
        icpiActor.get_token_metadata(),
        icpiActor.get_tvl_summary(),
      ])

      console.log('useActualAllocations: Got results', { tokenMetadataResult, tvlDataResult })

      // Unwrap Result types
      if (!('Ok' in tokenMetadataResult) || !('Ok' in tvlDataResult)) {
        throw new Error(
          'Err' in tokenMetadataResult ? tokenMetadataResult.Err :
          'Err' in tvlDataResult ? tvlDataResult.Err :
          'Failed to fetch data'
        )
      }
      const tokenMetadata = tokenMetadataResult.Ok
      const tvlData = tvlDataResult.Ok

      // Query balances directly from token canisters (true query calls!)
      const balancePromises = tokenMetadata.map(async (token: any) => {
        try {
          const tokenActor = Actor.createActor(ICRC1_IDL, {
            agent,
            canisterId: token.canister_id.toString(),
          })

          const balance = await tokenActor.icrc1_balance_of({
            owner: Principal.fromText(icpiCanisterId),
            subaccount: [],
          })

          return {
            symbol: token.symbol,
            balance: balance.toString(),
            decimals: token.decimals,
          }
        } catch (error) {
          console.error(`Error querying ${token.symbol} balance:`, error)
          return {
            symbol: token.symbol,
            balance: '0',
            decimals: token.decimals,
          }
        }
      })

      console.log('useActualAllocations: Querying token balances...')
      const balances = await Promise.all(balancePromises)
      console.log('useActualAllocations: Got balances:', balances)

      // Calculate USD values and percentages
      // For now, we need prices - we can get these from the backend or Kongswap
      // Let's use a simple approach: get current positions from backend for prices
      console.log('useActualAllocations: Calling get_index_state for prices...')
      const indexStateResult = await icpiActor.get_index_state()
      console.log('useActualAllocations: Got index state for prices')

      // Unwrap Result type
      if (!('Ok' in indexStateResult)) {
        throw new Error('Err' in indexStateResult ? indexStateResult.Err : 'Failed to get index state')
      }
      const indexState = indexStateResult.Ok

      // Only track these tokens in the index (exclude ckUSDT which is held for rebalancing)
      const TRACKED_TOKENS = ['ALEX', 'ZERO', 'KONG', 'BOB']

      const allocations = balances
        .filter((bal) => TRACKED_TOKENS.includes(bal.symbol))
        .map((bal) => {
          const balance = BigInt(bal.balance)
          const decimals = BigInt(10) ** BigInt(bal.decimals)
          const balanceFloat = Number(balance) / Number(decimals)

          // Find matching position for price
          const position = indexState.current_positions.find(
            (p: any) => p.token[Object.keys(p.token)[0]] !== undefined &&
                        Object.keys(p.token)[0] === bal.symbol
          )

          const usdValue = position ? position.usd_value : 0

          // Find target from TVL data
          const tvlEntry = tvlData.tokens.find(
            (t: any) => Object.keys(t.token)[0] === bal.symbol
          )
          const targetPercent = tvlEntry ? tvlEntry.percentage : 0

          return {
            token: bal.symbol,
            balance: balanceFloat,
            value: usdValue,
            decimals: bal.decimals,
            targetPercent,
          }
        })

      // Calculate actual percentages (only from tracked tokens, excluding ckUSDT)
      const totalValue = allocations.reduce((sum, a) => sum + a.value, 0)

      const result = allocations.map((a) => ({
        token: a.token,
        value: a.value,
        currentPercent: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
        targetPercent: a.targetPercent ?? 0,
        deviation: totalValue > 0 ? (a.targetPercent ?? 0) - (a.value / totalValue) * 100 : 0,
      }))

      console.log('useActualAllocations: Returning result:', result)
      return result
    },
    enabled: !!icpiActor && !!icpiCanisterId && !!agent,
    refetchInterval: 2 * 60_000, // Refetch every 2 minutes (query calls are fast but no need to spam)
    staleTime: 60_000,
  })
}

// Hook to get tracked tokens
export const useTrackedTokens = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TRACKED_TOKENS],
    queryFn: async () => {
      if (!actor) return ['ALEX', 'ZERO', 'KONG', 'BOB'] // Fallback
      return await actor.get_tracked_tokens()
    },
    staleTime: 5 * 60_000, // Cache for 5 minutes
  })
}

// Hook to get user wallet balances for all tokens
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
      const icpiMetadata = {
        symbol: 'ICPI',
        canister_id: Principal.fromText(ICPI_CANISTER_ID),
        decimals: 8, // ICPI has 8 decimals
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

// Helper function to calculate allocations
function calculateAllocations(state: any, tvl: any) {
  // This would process the raw data into the format needed by the UI
  const tokens = ['ALEX', 'ZERO', 'KONG', 'BOB']
  return tokens.map(token => {
    // Calculate based on actual holdings vs TVL targets
    return {
      token,
      value: 0, // Calculate from state
      currentPercent: 0, // Calculate
      targetPercent: 0, // From TVL data
      deviation: 0, // Current - Target
    }
  })
}