import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Page layout component with optional golden header treatment
 * Provides consistent page structure across /app routes
 */
export function PageLayout({
  title,
  description,
  actions,
  children,
  goldHeader = false,
  className
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Page Header */}
      <div className={cn(
        "relative",
        goldHeader && "pb-6"
      )}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className={cn(
              "text-3xl font-display tracking-wide",
              goldHeader ? "text-executive-ivory" : ""
            )}>
              {title}
            </h1>

            {/* Decorative golden underline */}
            {goldHeader && (
              <div className="h-px w-24 bg-gradient-to-r from-executive-gold via-executive-gold/50 to-transparent"></div>
            )}

            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Bottom decorative line */}
        {goldHeader && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-executive-gold/20 via-executive-gold/10 to-transparent"></div>
        )}
      </div>

      {/* Page Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
