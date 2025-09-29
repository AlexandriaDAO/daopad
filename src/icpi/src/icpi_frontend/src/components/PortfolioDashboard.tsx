import React from 'react'
import { StatsGrid } from './StatsGrid'
import { AllocationChart, TokenAllocation } from './AllocationChart'
import { HoldingsTable, Holding } from './HoldingsTable'
import { RebalancingPanel } from './RebalancingPanel'
import { TVLMonitor, TVLData } from './TVLMonitor'

interface PortfolioDashboardProps {
  portfolioData: {
    portfolioValue: number
    indexPrice: number
    totalSupply: number
    apy: number
    dailyChange: number
    priceChange: number
  }
  allocations: TokenAllocation[]
  holdings: Holding[]
  tvlData: TVLData[]
  rebalancingData: {
    nextRebalance: Date
    nextAction: any
    history: any[]
    isRebalancing: boolean
    autoEnabled: boolean
  }
  onManualRebalance: () => Promise<void>
  onToggleAutoRebalance: (enabled: boolean) => void
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  portfolioData,
  allocations,
  holdings,
  tvlData,
  rebalancingData,
  onManualRebalance,
  onToggleAutoRebalance,
}) => {
  return (
    <div className="space-y-6">
      <StatsGrid
        portfolioValue={portfolioData.portfolioValue}
        indexPrice={portfolioData.indexPrice}
        totalSupply={portfolioData.totalSupply}
        apy={portfolioData.apy}
        dailyChange={portfolioData.dailyChange}
        priceChange={portfolioData.priceChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AllocationChart data={allocations} />
          <HoldingsTable holdings={holdings} />
        </div>
        <div className="space-y-6">
          <RebalancingPanel
            nextRebalance={rebalancingData.nextRebalance}
            nextAction={rebalancingData.nextAction}
            rebalanceHistory={rebalancingData.history}
            isRebalancing={rebalancingData.isRebalancing}
            onManualRebalance={onManualRebalance}
            onToggleAutoRebalance={onToggleAutoRebalance}
            autoRebalanceEnabled={rebalancingData.autoEnabled}
          />
          <TVLMonitor
            tvlData={tvlData}
            totalLockCanisters={12}
          />
        </div>
      </div>
    </div>
  )
}