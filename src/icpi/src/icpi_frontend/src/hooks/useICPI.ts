import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Actor } from '@dfinity/agent'

// Define the query keys
export const QUERY_KEYS = {
  INDEX_STATE: 'indexState',
  REBALANCER_STATUS: 'rebalancerStatus',
  TVL_DATA: 'tvlData',
  USER_BALANCE: 'userBalance',
  HOLDINGS: 'holdings',
  ALLOCATION: 'allocation',
} as const

// Custom hooks for ICPI data
export const useIndexState = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.INDEX_STATE],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      return await actor.get_index_state()
    },
    enabled: !!actor,
    refetchInterval: 30_000, // Refetch every 30 seconds
    staleTime: 20_000,
  })
}

export const useRebalancerStatus = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.REBALANCER_STATUS],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      return await actor.get_rebalancer_status()
    },
    enabled: !!actor,
    refetchInterval: 10_000, // More frequent for countdown
    staleTime: 5_000,
  })
}

export const useTVLData = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TVL_DATA],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      return await actor.get_tvl_summary()
    },
    enabled: !!actor,
    staleTime: 5 * 60_000, // 5 minutes
    refetchInterval: 60_000, // Refetch every minute
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
    refetchInterval: 30_000,
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
    refetchInterval: 30_000,
  })
}

export const useAllocation = (actor: Actor | null) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ALLOCATION],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized')
      const state = await actor.get_index_state()
      const tvl = await actor.get_tvl_summary()
      
      // Calculate allocations based on state and TVL
      return calculateAllocations(state, tvl)
    },
    enabled: !!actor,
    refetchInterval: 30_000,
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