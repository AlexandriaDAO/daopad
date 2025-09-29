import React from 'react'
import { Wallet, DollarSign, Coins, TrendingUp } from 'lucide-react'
import { StatCard } from './ui/stat-card'
import { formatNumber } from '@/lib/utils'

interface StatsGridProps {
  portfolioValue: number
  indexPrice: number
  totalSupply: number
  apy: number
  dailyChange: number
  priceChange: number
  isLoading?: boolean
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  portfolioValue,
  indexPrice,
  totalSupply,
  apy,
  dailyChange,
  priceChange,
  isLoading = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Portfolio Value"
        value={formatNumber(portfolioValue)}
        change={dailyChange}
        changeLabel="24h"
        icon={Wallet}
        loading={isLoading}
      />
      <StatCard
        title="Index Price"
        value={`$${indexPrice.toFixed(4)}`}
        change={priceChange}
        changeLabel="24h"
        icon={DollarSign}
        loading={isLoading}
      />
      <StatCard
        title="Total Supply"
        value={formatNumber(totalSupply)}
        icon={Coins}
        loading={isLoading}
      />
      <StatCard
        title="APY"
        value={`${apy.toFixed(2)}%`}
        icon={TrendingUp}
        loading={isLoading}
      />
    </div>
  )
}