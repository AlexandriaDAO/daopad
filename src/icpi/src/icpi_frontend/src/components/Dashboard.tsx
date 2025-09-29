import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { PortfolioDashboard } from './PortfolioDashboard'
import { MintInterface } from './MintInterface'
import { RedeemInterface } from './RedeemInterface'
import { DashboardHeader } from './DashboardHeader'
import { PieChart, Plus, Minus, TrendingUp, History } from 'lucide-react'

interface DashboardProps {
  principal: string
  balance: string
  tvl: number
  portfolioData: any
  allocations: any[]
  holdings: any[]
  tvlData: any[]
  rebalancingData: any
  userICPIBalance: number
  userUSDTBalance: number
  tokenHoldings: any[]
  onDisconnect: () => void
  onMint: (amount: number) => Promise<void>
  onRedeem: (amount: number) => Promise<void>
  onManualRebalance: () => Promise<void>
  onToggleAutoRebalance: (enabled: boolean) => void
}

export const Dashboard: React.FC<DashboardProps> = ({
  principal,
  balance,
  tvl,
  portfolioData,
  allocations,
  holdings,
  tvlData,
  rebalancingData,
  userICPIBalance,
  userUSDTBalance,
  tokenHoldings,
  onDisconnect,
  onMint,
  onRedeem,
  onManualRebalance,
  onToggleAutoRebalance,
}) => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        principal={principal}
        balance={balance}
        tvl={tvl}
        onDisconnect={onDisconnect}
      />
      
      <div className="container py-8">
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 glass-effect">
            <TabsTrigger value="portfolio">
              <PieChart className="w-4 h-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="mint">
              <Plus className="w-4 h-4 mr-2" />
              Mint
            </TabsTrigger>
            <TabsTrigger value="redeem">
              <Minus className="w-4 h-4 mr-2" />
              Redeem
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            <PortfolioDashboard
              portfolioData={portfolioData}
              allocations={allocations}
              holdings={holdings}
              tvlData={tvlData}
              rebalancingData={rebalancingData}
              onManualRebalance={onManualRebalance}
              onToggleAutoRebalance={onToggleAutoRebalance}
            />
          </TabsContent>

          <TabsContent value="mint">
            <MintInterface
              currentTVL={tvl}
              currentSupply={portfolioData.totalSupply}
              userBalance={userUSDTBalance}
              onMint={onMint}
            />
          </TabsContent>

          <TabsContent value="redeem">
            <RedeemInterface
              userICPIBalance={userICPIBalance}
              tokenHoldings={tokenHoldings}
              onRedeem={onRedeem}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              Analytics coming soon...
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              Transaction history coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}