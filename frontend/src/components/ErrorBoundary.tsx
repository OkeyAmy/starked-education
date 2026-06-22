'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public static defaultProps = {
    onReset: undefined
  };
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error);
    if (errorInfo.componentStack) {
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  public componentDidUpdate(prevProps: Props) {
    // Reset error state when children change (e.g., on navigation when key changes)
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.handleReset();
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  private handleRetry = () => {
    this.handleReset();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
          <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-xl shadow-lg p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Something went wrong
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {isDev
                ? this.state.error?.message || 'An unexpected error occurred.'
                : 'An unexpected error occurred. Our team has been notified.'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Please try again or return to the home page.
            </p>

            {isDev && this.state.error && (
              <details className="mb-6">
                <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-md overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  {this.state.errorInfo?.componentStack && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <Link
                href="/"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
