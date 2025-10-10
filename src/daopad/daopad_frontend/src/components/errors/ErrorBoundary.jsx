import React from 'react';
import ErrorFallback from './ErrorFallback';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState(prevState => {
      const newErrorCount = prevState.errorCount + 1;

      // Auto-reset after 3 errors (prevent infinite error loops)
      if (newErrorCount >= 3) {
        console.warn('Too many errors, forcing reset');
        setTimeout(() => {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0,
          });
        }, 1000);
      }

      return {
        error,
        errorInfo,
        errorCount: newErrorCount,
      };
    });

    // Optional: Send to error tracking service
    // sendErrorToTracking(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,  // Reset error count when user manually resets
    });

    // Optional: Notify parent to refetch data
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.handleReset}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
