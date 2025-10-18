import React from 'react';
import ErrorBoundary from './ErrorBoundary';

function RouteErrorBoundary({ children, onReset }) {
  return (
    <ErrorBoundary level="route" onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}

export default RouteErrorBoundary;
