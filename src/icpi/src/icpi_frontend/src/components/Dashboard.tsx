import React from 'react'
import { PortfolioDashboard } from './PortfolioDashboard'
import { TradeInterface } from './TradeInterface'
import { DashboardHeader } from './DashboardHeader'
import { WalletBalances } from './WalletBalances'
import { UserTokenBalance } from '@/hooks/useICPI'

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
  walletBalances: UserTokenBalance[]
  onDisconnect: () => void
  onMint: (amount: number) => Promise<void>
  onRedeem: (amount: number) => Promise<void>
  onManualRebalance: () => Promise<void>
  onToggleAutoRebalance: (enabled: boolean) => void
  onSendToken: (symbol: string) => void
  onRefreshBalances: () => void
}

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
  walletBalances,
  onDisconnect,
  onMint,
  onRedeem,
  onManualRebalance,
  onToggleAutoRebalance,
  onSendToken,
  onRefreshBalances,
}) => {
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

          {/* Right: Wallet Balances */}
          <WalletBalances
            balances={walletBalances}
            userPrincipal={principal}
            onSendToken={onSendToken}
            onRefresh={onRefreshBalances}
          />
        </div>
      </div>
    </div>
  )
}