import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { ArrowDown, Info, Loader2, Plus } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface MintInterfaceProps {
  currentTVL: number
  currentSupply: number
  userBalance: number
  onMint: (amount: number) => Promise<void>
}

export const MintInterface: React.FC<MintInterfaceProps> = ({
  currentTVL,
  currentSupply,
  userBalance,
  onMint,
}) => {
  const [amount, setAmount] = useState('')
  const [isMinting, setIsMinting] = useState(false)
  const [error, setError] = useState('')

  const calculateReceiveAmount = (usdtAmount: number) => {
    if (currentSupply === 0) return usdtAmount
    return (usdtAmount * currentSupply) / currentTVL
  }

  const receiveAmount = amount ? calculateReceiveAmount(parseFloat(amount)) : 0
  const sharePercent = amount ? (parseFloat(amount) / (currentTVL + parseFloat(amount))) * 100 : 0

  const handleMint = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (parseFloat(amount) > userBalance) {
      setError('Insufficient ckUSDT balance')
      return
    }

    setError('')
    setIsMinting(true)
    try {
      await onMint(parseFloat(amount))
      setAmount('')
    } catch (err: any) {
      setError(err.message || 'Minting failed')
    } finally {
      setIsMinting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Mint ICPI Tokens
          </CardTitle>
          <CardDescription>
            Deposit ckUSDT to mint ICPI index tokens and gain exposure to the portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Deposit Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-16 text-lg font-mono"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Badge variant="secondary">ckUSDT</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Balance: {formatNumber(userBalance)}</span>
              <button
                onClick={() => setAmount(userBalance.toString())}
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
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono">
                  {receiveAmount.toFixed(6)}
                </span>
                <Badge variant="outline">ICPI</Badge>
              </div>
              {sharePercent > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {sharePercent.toFixed(4)}% of total supply
                </div>
              )}
            </div>
          </div>

          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Current TVL:</span>
                  <span className="font-mono">{formatNumber(currentTVL)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Supply:</span>
                  <span className="font-mono">{currentSupply.toFixed(2)} ICPI</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Price per ICPI:</span>
                  <span className="font-mono">
                    ${currentSupply > 0 ? (currentTVL / currentSupply).toFixed(4) : '1.0000'}
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90"
            size="lg"
            onClick={handleMint}
            disabled={isMinting || !amount || parseFloat(amount) <= 0}
          >
            {isMinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              <>Mint ICPI</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-lg">How Minting Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            1. Deposit ckUSDT to receive proportional ICPI tokens
          </p>
          <p>
            2. Your ckUSDT is held until the next rebalancing cycle
          </p>
          <p>
            3. ICPI tokens represent your share of the index portfolio
          </p>
          <p>
            4. The index automatically rebalances every hour to track locked liquidity
          </p>
        </CardContent>
      </Card>
    </div>
  )
}