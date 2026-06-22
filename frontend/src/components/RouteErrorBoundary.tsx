'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public static defaultProps = {
    routeName: undefined
  };
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[RouteErrorBoundary${this.props.routeName ? `:${this.props.routeName}` : ''}] Error:`, error);
    if (errorInfo.componentStack) {
      console.error('[RouteErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  public componentDidUpdate(prevProps: Props) {
    // Reset error state when children change (e.g., navigation)
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.handleReset();
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
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
      const routeLabel = this.props.routeName || 'this section';

      return (
        <div className="w-full py-12 px-4">
          <div className="max-w-lg mx-auto bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">
                  Could not load {routeLabel}
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {isDev
                    ? this.state.error?.message || 'An error occurred loading this section.'
                    : 'An error occurred loading this section. The rest of the page is still functional.'}
                </p>
              </div>
            </div>

            {isDev && this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-amber-700 dark:text-amber-300 cursor-pointer">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/20 p-2 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Section
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
