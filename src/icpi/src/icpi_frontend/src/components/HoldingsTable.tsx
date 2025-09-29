import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface Holding {
  token: string
  balance: number
  value: number
  currentPercent: number
  targetPercent: number
  deviation: number
  recommendedAction: 'buy' | 'sell' | 'hold'
}

interface HoldingsTableProps {
  holdings: Holding[]
}

const TOKEN_COLORS: Record<string, string> = {
  ALEX: '#8B5CF6',
  ZERO: '#3B82F6',
  KONG: '#F97316',
  BOB: '#10B981',
  ICP: '#29ABE2',
  ckUSDT: '#26A17B',
}

const DeviationBadge: React.FC<{ deviation: number }> = ({ deviation }) => {
  const absDeviation = Math.abs(deviation)
  
  if (absDeviation < 1) {
    return (
      <Badge variant="success" className="font-mono">
        {deviation > 0 ? '+' : ''}{deviation.toFixed(2)}%
      </Badge>
    )
  }
  
  if (absDeviation < 3) {
    return (
      <Badge variant="warning" className="font-mono">
        {deviation > 0 ? '+' : ''}{deviation.toFixed(2)}%
      </Badge>
    )
  }
  
  return (
    <Badge variant="error" className="font-mono">
      {deviation > 0 ? '+' : ''}{deviation.toFixed(2)}%
    </Badge>
  )
}

const ActionIndicator: React.FC<{ action: string }> = ({ action }) => {
  if (action === 'buy') {
    return (
      <div className="flex items-center gap-1 text-green-400">
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs font-medium">Buy</span>
      </div>
    )
  }
  
  if (action === 'sell') {
    return (
      <div className="flex items-center gap-1 text-red-400">
        <TrendingDown className="w-4 h-4" />
        <span className="text-xs font-medium">Sell</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="w-4 h-4" />
      <span className="text-xs font-medium">Hold</span>
    </div>
  )
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings }) => {
  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Token Holdings</CardTitle>
        <CardDescription>
          Detailed breakdown of portfolio positions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead>Token</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Current %</TableHead>
              <TableHead className="text-right">Target %</TableHead>
              <TableHead className="text-right">Deviation</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map(holding => (
              <TableRow key={holding.token} className="border-white/5">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: `${TOKEN_COLORS[holding.token]}20`,
                        color: TOKEN_COLORS[holding.token]
                      }}
                    >
                      <span className="text-xs font-bold">
                        {holding.token[0]}
                      </span>
                    </div>
                    <span className="font-medium">{holding.token}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {holding.balance.toFixed(4)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatNumber(holding.value)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono">{holding.currentPercent.toFixed(2)}%</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-muted-foreground">
                    {holding.targetPercent.toFixed(2)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DeviationBadge deviation={holding.deviation} />
                </TableCell>
                <TableCell>
                  <ActionIndicator action={holding.recommendedAction} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}