import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Error boundary that catches BigInt conversion errors
 * Shows fallback UI instead of crashing entire component tree
 */
export class BalanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a BigInt-related error
    const isBigIntError = error.message?.includes('BigInt') ||
                          error.message?.includes('convert') ||
                          error.message?.includes('balance');

    return { hasError: true, error, isBigIntError };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging
    console.error('BalanceErrorBoundary caught error:', error, errorInfo);

    // Could send to error tracking service
    // if (window.Sentry) {
    //   Sentry.captureException(error);
    // }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {this.state.isBigIntError
              ? 'Error displaying balance data. Please refresh the page.'
              : 'An error occurred. Please try again.'}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * Loading state component for fallback
 */
export function BalanceLoadingState() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading balances...</p>
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for balance displays
 */
export function BalanceSkeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-muted rounded h-6 w-24 ${className}`}></div>
  );
}
