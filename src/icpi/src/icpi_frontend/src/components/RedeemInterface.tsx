import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { ArrowDown, Info, Loader2, Minus } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface TokenAmount {
  token: string
  amount: number
  value: number
}

interface RedeemInterfaceProps {
  userICPIBalance: number
  tokenHoldings: TokenAmount[]
  onRedeem: (amount: number) => Promise<void>
}

export const RedeemInterface: React.FC<RedeemInterfaceProps> = ({
  userICPIBalance,
  tokenHoldings,
  onRedeem,
}) => {
  const [amount, setAmount] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [error, setError] = useState('')

  const calculateReceiveAmounts = (icpiAmount: number): TokenAmount[] => {
    const redeemPercent = userICPIBalance > 0 ? icpiAmount / userICPIBalance : 0
    return tokenHoldings.map(holding => ({
      token: holding.token,
      amount: holding.amount * redeemPercent,
      value: holding.value * redeemPercent,
    }))
  }

  const receiveAmounts = amount ? calculateReceiveAmounts(parseFloat(amount)) : []
  const totalValue = receiveAmounts.reduce((sum, item) => sum + item.value, 0)

  const handleRedeem = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (parseFloat(amount) > userICPIBalance) {
      setError('Insufficient ICPI balance')
      return
    }

    setError('')
    setIsRedeeming(true)
    try {
      await onRedeem(parseFloat(amount))
      setAmount('')
    } catch (err: any) {
      setError(err.message || 'Redemption failed')
    } finally {
      setIsRedeeming(false)
    }
  }

  const TOKEN_COLORS: Record<string, string> = {
    ALEX: '#8B5CF6',
    ZERO: '#3B82F6',
    KONG: '#F97316',
    BOB: '#10B981',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Minus className="w-5 h-5" />
            Redeem ICPI Tokens
          </CardTitle>
          <CardDescription>
            Burn ICPI tokens to receive proportional amounts of all underlying tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="redeem-amount">Redeem Amount</Label>
            <div className="relative">
              <Input
                id="redeem-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-16 text-lg font-mono"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Badge variant="secondary">ICPI</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Balance: {userICPIBalance.toFixed(6)} ICPI</span>
              <button
                onClick={() => setAmount(userICPIBalance.toString())}
                className="text-primary hover:underline"
              >
                Max
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="rounded-full bg-muted p-2">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>You Will Receive</Label>
            <div className="space-y-2">
              {receiveAmounts.length > 0 ? (
                receiveAmounts.map(item => (
                  <div
                    key={item.token}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: `${TOKEN_COLORS[item.token]}20`,
                          color: TOKEN_COLORS[item.token],
                        }}
                      >
                        {item.token[0]}
                      </div>
                      <span className="font-medium">{item.token}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{item.amount.toFixed(6)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(item.value)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  Enter an amount to see redemption breakdown
                </div>
              )}
            </div>
            {totalValue > 0 && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Value</span>
                  <span className="text-lg font-bold text-gradient">
                    {formatNumber(totalValue)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Alert className="border-yellow-500/20 bg-yellow-500/5">
            <Info className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-200/80">
              Redemption burns your ICPI tokens and returns proportional amounts of all 
              tokens currently held by the index. You receive exactly your share of each token.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            variant="destructive"
            size="lg"
            onClick={handleRedeem}
            disabled={isRedeeming || !amount || parseFloat(amount) <= 0}
          >
            {isRedeeming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redeeming...
              </>
            ) : (
              <>Redeem ICPI</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-lg">Redemption Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            • Redemption is proportional - burn 1% of supply, receive 1% of each holding
          </p>
          <p>
            • No fees or slippage on redemption
          </p>
          <p>
            • Tokens are transferred directly to your wallet
          </p>
          <p>
            • You can trade received tokens on Kongswap or hold them
          </p>
        </CardContent>
      </Card>
    </div>
  )
}