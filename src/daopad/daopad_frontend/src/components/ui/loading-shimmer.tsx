import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingShimmerProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Loading shimmer component with golden accent animation
 * Used for skeleton loading states
 */
export function LoadingShimmer({ className, ...props }: LoadingShimmerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-executive-darkGray/50",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-executive-gold/10 before:to-transparent",
        "before:animate-shimmer",
        className
      )}
      {...props}
    >
      <div className="h-full w-full bg-executive-charcoal/80"></div>
    </div>
  );
}
