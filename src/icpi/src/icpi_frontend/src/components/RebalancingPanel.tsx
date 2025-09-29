import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Activity, RefreshCw, Loader2, Info, Clock, ArrowRight } from 'lucide-react'

interface RebalanceAction {
  type: 'buy' | 'sell'
  token: string
  amount: number
  usdtAmount: number
}

interface RebalanceHistoryItem {
  timestamp: Date
  action: RebalanceAction
  status: 'success' | 'failed'
  txHash?: string
}

interface RebalancingPanelProps {
  nextRebalance: Date
  nextAction: RebalanceAction | null
  rebalanceHistory: RebalanceHistoryItem[]
  isRebalancing: boolean
  onManualRebalance: () => Promise<void>
  onToggleAutoRebalance: (enabled: boolean) => void
  autoRebalanceEnabled: boolean
}

const CountdownTimer: React.FC<{ targetTime: Date }> = ({ targetTime }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const target = targetTime.getTime()
      const difference = target - now

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft('Now')
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [targetTime])

  return <span className="font-mono text-primary">{timeLeft}</span>
}

const RebalanceHistoryItem: React.FC<RebalanceHistoryItem> = ({
  timestamp,
  action,
  status,
  txHash,
}) => {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${
          status === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {action.type === 'buy' ? 'Bought' : 'Sold'}
            </span>
            <Badge variant="outline" className="text-xs">
              {action.token}
            </Badge>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {action.amount.toFixed(4)} tokens
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      {txHash && (
        <a
          href={`https://dashboard.internetcomputer.org/transaction/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          View
        </a>
      )}
    </div>
  )
}

export const RebalancingPanel: React.FC<RebalancingPanelProps> = ({
  nextRebalance,
  nextAction,
  rebalanceHistory,
  isRebalancing,
  onManualRebalance,
  onToggleAutoRebalance,
  autoRebalanceEnabled,
}) => {
  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Rebalancing Engine</span>
          <Switch
            checked={autoRebalanceEnabled}
            onCheckedChange={onToggleAutoRebalance}
            className="data-[state=checked]:bg-primary"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextAction && (
          <Alert className="border-primary/20 bg-primary/5">
            <Activity className="h-4 w-4" />
            <AlertTitle>Next Rebalance Action</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Action:</span>
                  <Badge variant={nextAction.type === 'buy' ? 'success' : 'warning'}>
                    {nextAction.type.toUpperCase()} {nextAction.token}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-mono">{nextAction.usdtAmount.toFixed(2)} ckUSDT</span>
                </div>
                <div className="flex justify-between">
                  <span>Executes in:</span>
                  <CountdownTimer targetTime={nextRebalance} />
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            variant="default"
            className="flex-1 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90"
            onClick={onManualRebalance}
            disabled={isRebalancing}
          >
            {isRebalancing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rebalancing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Execute Now
              </>
            )}
          </Button>
          <Button variant="outline" size="icon">
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="my-4" />
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Activity</h4>
          <ScrollArea className="h-[200px] pr-4">
            {rebalanceHistory.length > 0 ? (
              <div className="space-y-2">
                {rebalanceHistory.map((item, idx) => (
                  <RebalanceHistoryItem key={idx} {...item} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No rebalancing activity yet
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}