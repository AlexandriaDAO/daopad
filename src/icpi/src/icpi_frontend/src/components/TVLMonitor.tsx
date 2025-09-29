import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { formatNumber } from '@/lib/utils'
import { Coins } from 'lucide-react'

export interface TVLData {
  symbol: string
  tvlUSD: number
  percentage: number
  poolCount: number
  lockCanisters: number
}

interface TVLMonitorProps {
  tvlData: TVLData[]
  totalLockCanisters: number
}

const TOKEN_COLORS: Record<string, string> = {
  ALEX: '#8B5CF6',
  ZERO: '#3B82F6',
  KONG: '#F97316',
  BOB: '#10B981',
  ICP: '#29ABE2',
  ckUSDT: '#26A17B',
}

const TokenIcon: React.FC<{ token: string }> = ({ token }) => (
  <div
    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
    style={{
      backgroundColor: `${TOKEN_COLORS[token]}20`,
      color: TOKEN_COLORS[token],
    }}
  >
    {token[0]}
  </div>
)

export const TVLMonitor: React.FC<TVLMonitorProps> = ({ 
  tvlData, 
  totalLockCanisters 
}) => {
  const sortedData = [...tvlData].sort((a, b) => b.tvlUSD - a.tvlUSD)

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Locked Liquidity Sources
        </CardTitle>
        <CardDescription>
          {totalLockCanisters} lock canisters tracked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map(token => (
            <div key={token.symbol} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TokenIcon token={token.symbol} />
                  <span className="font-medium">{token.symbol}</span>
                  <Badge variant="secondary" className="text-xs">
                    {token.poolCount} pools
                  </Badge>
                </div>
                <span className="font-mono text-gradient">
                  {formatNumber(token.tvlUSD)}
                </span>
              </div>
              <Progress
                value={token.percentage}
                className="h-2"
                indicatorClassName="bg-gradient-to-r from-green-400 to-emerald-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{token.lockCanisters} canisters</span>
                <span>{token.percentage.toFixed(2)}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total Locked Value</span>
            <span className="text-xl font-bold text-gradient">
              {formatNumber(tvlData.reduce((sum, t) => sum + t.tvlUSD, 0))}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated every hour from {totalLockCanisters} lock canisters
          </div>
        </div>
      </CardContent>
    </Card>
  )
}