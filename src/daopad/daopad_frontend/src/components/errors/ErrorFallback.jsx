import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

function ErrorFallback({ error, errorInfo, resetError, level = 'component' }) {
  const isAppLevel = level === 'app';
  const isRouteLevel = level === 'route';

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-executive-charcoal p-4">
      <Card className="max-w-2xl w-full p-8 bg-executive-darkGray border-executive-gold/20">
        <div className="flex items-start gap-4 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-executive-ivory mb-2">
              {isAppLevel && 'Application Error'}
              {isRouteLevel && 'Page Error'}
              {!isAppLevel && !isRouteLevel && 'Something Went Wrong'}
            </h1>
            <p className="text-executive-lightGray">
              {isAppLevel && 'The application encountered an unexpected error.'}
              {isRouteLevel && 'This page encountered an error.'}
              {!isAppLevel && !isRouteLevel && 'A component on this page encountered an error.'}
            </p>
          </div>
        </div>

        {import.meta.env.DEV && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error Details (Development Only)</AlertTitle>
            <AlertDescription>
              <pre className="mt-2 text-xs overflow-auto max-h-60 bg-black/20 p-4 rounded">
                {error?.toString()}
                {errorInfo?.componentStack}
              </pre>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          {!isAppLevel && (
            <Button
              onClick={resetError}
              variant="default"
              className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}

          <Button
            onClick={handleReload}
            variant="outline"
            className="border-executive-gold/30 text-executive-lightGray"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>

          {!isAppLevel && (
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="border-executive-gold/30 text-executive-lightGray"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>

        {isAppLevel && (
          <div className="mt-6 text-sm text-executive-lightGray/60">
            <p>
              If this error persists, please contact support or try again later.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ErrorFallback;
