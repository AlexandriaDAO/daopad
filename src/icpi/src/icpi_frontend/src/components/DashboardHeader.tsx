import React from 'react'
import { Sparkles } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { formatNumber, shortenAddress } from '@/lib/utils'

interface HeaderProps {
  principal: string
  balance: string
  tvl: number
  onDisconnect: () => void
}

export const DashboardHeader: React.FC<HeaderProps> = ({
  principal,
  balance,
  tvl,
  onDisconnect,
}) => {
  return (
    <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center space-x-4">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">ICPI</h1>
          <Badge variant="outline" className="glass-effect">
            TVL: {formatNumber(tvl)}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {shortenAddress(principal)}
          </span>
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>
    </header>
  )
}