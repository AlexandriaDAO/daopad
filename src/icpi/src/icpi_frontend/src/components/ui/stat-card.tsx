import * as React from "react"
import { cn } from "../../lib/utils"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  loading?: boolean
  className?: string
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  loading = false,
  className
}: StatCardProps) {
  const isPositive = change && change >= 0

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border bg-card/50 backdrop-blur-sm p-6 shadow-xl border-white/5 hover:shadow-2xl transition-all duration-300",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-muted/50 animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold font-mono">
              {value}
            </div>
          )}
          {change !== undefined && !loading && (
            <div className="flex items-center space-x-1 text-xs">
              {isPositive ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={cn(
                "font-medium",
                isPositive ? "text-green-500" : "text-red-500"
              )}>
                {isPositive ? "+" : ""}{change.toFixed(2)}%
              </span>
              {changeLabel && (
                <span className="text-muted-foreground ml-1">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-full p-3 bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
    </div>
  )
}