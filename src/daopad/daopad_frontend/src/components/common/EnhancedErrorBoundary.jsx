/**
 * Enhanced Error Boundary Component
 *
 * Provides:
 * - Error catching and recovery
 * - User-friendly error UI
 * - Error logging and tracking
 * - Reset functionality
 * - Development error details
 */

import React from 'react';
import { logger } from '../../services/logging/Logger';
import { ErrorHandler } from '../../utils/errorHandling';

/**
 * Enhanced Error Boundary
 * Catches React component errors and provides recovery UI
 */
class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      timestamp: null
    };
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log error to monitoring service
   */
  componentDidCatch(error, errorInfo) {
    const { name, onError } = this.props;

    // Increment error count
    this.setState(prev => ({
      errorCount: prev.errorCount + 1,
      errorInfo
    }));

    // Classify the error
    const classification = ErrorHandler.classify(error);

    // Log error details
    logger.captureError(error, {
      componentStack: errorInfo.componentStack,
      componentName: this.props.name || 'Unknown',
      errorBoundary: name || 'EnhancedErrorBoundary',
      classification,
      errorCount: this.state.errorCount + 1,
      props: this.sanitizeProps(this.props)
    });

    // Escalate if too many errors
    if (this.state.errorCount >= 5) {
      logger.error('Error boundary triggered too frequently', {
        count: this.state.errorCount + 1,
        boundary: name,
        component: name
      });
    }

    // Call custom error handler if provided
    if (onError && typeof onError === 'function') {
      try {
        onError(error, errorInfo, classification);
      } catch (handlerError) {
        logger.error('Error handler callback failed', {
          error: handlerError.message
        });
      }
    }
  }

  /**
   * Sanitize props for logging (remove sensitive data)
   */
  sanitizeProps(props) {
    const { children, ...rest } = props;
    return {
      ...rest,
      childrenType: typeof children
    };
  }

  /**
   * Reset error boundary state
   */
  handleReset = () => {
    const { onReset } = this.props;

    logger.info('Error boundary reset', {
      boundary: this.props.name,
      errorCount: this.state.errorCount
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      timestamp: null
    });

    // Call custom reset handler if provided
    if (onReset && typeof onReset === 'function') {
      try {
        onReset();
      } catch (error) {
        logger.error('Reset handler failed', { error: error.message });
      }
    }
  };

  /**
   * Reload the page
   */
  handleReload = () => {
    logger.info('Page reload requested from error boundary', {
      boundary: this.props.name
    });

    window.location.reload();
  };

  /**
   * Go back in history
   */
  handleGoBack = () => {
    logger.info('Navigation back requested from error boundary', {
      boundary: this.props.name
    });

    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    const { hasError, error, errorInfo, errorCount, timestamp } = this.state;
    const {
      children,
      fallback,
      fallbackMessage,
      showDetails,
      name
    } = this.props;

    // If no error, render children normally
    if (!hasError) {
      return children;
    }

    // If custom fallback provided, use it
    if (fallback && typeof fallback === 'function') {
      return fallback(error, this.handleReset, this.handleReload);
    }

    // Default fallback UI
    const isDev = import.meta.env?.DEV ?? false;
    const shouldShowDetails = showDetails ?? isDev;
    const classification = ErrorHandler.classify(error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6">
          {/* Error Icon */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {fallbackMessage || 'Something went wrong'}
          </h2>

          {/* Error Description */}
          <p className="text-gray-600 text-center mb-6">
            {classification.userMessage}
          </p>

          {/* Error Count Warning */}
          {errorCount > 2 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This error has occurred {errorCount} times. If the problem persists, please reload the page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Development Details */}
          {shouldShowDetails && error && (
            <details className="mb-6 bg-gray-50 rounded p-4">
              <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                Error Details (Development Only)
              </summary>
              <div className="mt-2 space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Error:</span>
                  <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto max-h-32">
                    {error.toString()}
                  </pre>
                </div>
                {errorInfo?.componentStack && (
                  <div>
                    <span className="font-semibold text-gray-700">Component Stack:</span>
                    <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto max-h-32">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
                {error.stack && (
                  <div>
                    <span className="font-semibold text-gray-700">Stack Trace:</span>
                    <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {name && (
                  <div>
                    <span className="font-semibold text-gray-700">Boundary:</span>
                    <span className="ml-2 text-gray-600">{name}</span>
                  </div>
                )}
                {timestamp && (
                  <div>
                    <span className="font-semibold text-gray-700">Timestamp:</span>
                    <span className="ml-2 text-gray-600">{new Date(timestamp).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>

            <button
              onClick={this.handleReload}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Reload Page
            </button>

            {classification.action === 'GO_BACK' && (
              <button
                onClick={this.handleGoBack}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Go Back
              </button>
            )}
          </div>

          {/* Help Text */}
          <p className="mt-6 text-sm text-gray-500 text-center">
            If the problem continues, please try clearing your browser cache or contact support.
          </p>
        </div>
      </div>
    );
  }
}

EnhancedErrorBoundary.defaultProps = {
  name: 'ErrorBoundary',
  fallbackMessage: null,
  fallback: null,
  showDetails: null,
  onError: null,
  onReset: null
};

/**
 * Higher-Order Component to wrap components with error boundary
 */
export function withEnhancedErrorBoundary(Component, options = {}) {
  const {
    name,
    fallbackMessage,
    fallback,
    showDetails,
    onError,
    onReset
  } = options;

  return function WrappedComponent(props) {
    return (
      <EnhancedErrorBoundary
        name={name || Component.name || Component.displayName || 'Unknown'}
        fallbackMessage={fallbackMessage}
        fallback={fallback}
        showDetails={showDetails}
        onError={onError}
        onReset={onReset}
      >
        <Component {...props} />
      </EnhancedErrorBoundary>
    );
  };
}

export default EnhancedErrorBoundary;
