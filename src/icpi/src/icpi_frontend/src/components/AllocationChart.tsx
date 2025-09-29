import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { BarChart3 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatNumber } from '@/lib/utils'

export interface TokenAllocation {
  token: string
  value: number
  currentPercent: number
  targetPercent: number
  deviation: number
}

interface AllocationChartProps {
  data: TokenAllocation[]
  height?: number
}

const TOKEN_COLORS: Record<string, string> = {
  ALEX: '#8B5CF6',
  ZERO: '#3B82F6',
  KONG: '#F97316',
  BOB: '#10B981',
  ICP: '#29ABE2',
  ckUSDT: '#26A17B',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0]
    return (
      <div className="glass-effect p-3 rounded-lg border border-white/10">
        <p className="text-sm font-medium">{data.name}</p>
        <p className="text-xs text-muted-foreground">
          Value: {formatNumber(data.value)}
        </p>
        <p className="text-xs text-muted-foreground">
          Percentage: {data.payload.currentPercent.toFixed(2)}%
        </p>
      </div>
    )
  }
  return null
}

const AllocationBar: React.FC<{
  token: string
  current: number
  target: number
  value: number
  deviation: number
}> = ({ token, current, target, value, deviation }) => {
  const getDeviationColor = (dev: number) => {
    if (Math.abs(dev) < 1) return 'text-green-400'
    if (Math.abs(dev) < 3) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getDeviationBadge = (dev: number) => {
    if (Math.abs(dev) < 1) return 'success'
    if (Math.abs(dev) < 3) return 'warning'
    return 'error'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: TOKEN_COLORS[token] }}
          />
          <span className="font-medium">{token}</span>
          <Badge variant={getDeviationBadge(deviation) as any} className="text-xs">
            {deviation > 0 ? '+' : ''}{deviation.toFixed(2)}%
          </Badge>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {formatNumber(value)}
        </span>
      </div>
      <div className="relative">
        <Progress 
          value={current} 
          className="h-2"
          indicatorClassName="bg-gradient-to-r from-primary/60 to-primary"
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-white/50"
          style={{ left: `${target}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Current: {current.toFixed(2)}%</span>
        <span>Target: {target.toFixed(2)}%</span>
      </div>
    </div>
  )
}

export const AllocationChart: React.FC<AllocationChartProps> = ({ 
  data, 
  height = 300 
}) => {
  const chartData = data.map(item => ({
    ...item,
    name: item.token,
  }))

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Token Allocation</span>
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
        </CardTitle>
        <CardDescription>
          Current index composition vs locked liquidity targets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="token"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ token, currentPercent }) => 
                `${token} ${currentPercent.toFixed(1)}%`
              }
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={TOKEN_COLORS[entry.token] || '#888'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-3 mt-6">
          {data.map(token => (
            <AllocationBar
              key={token.token}
              token={token.token}
              current={token.currentPercent}
              target={token.targetPercent}
              value={token.value}
              deviation={token.deviation}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}