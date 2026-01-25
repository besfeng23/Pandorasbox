// frontend/src/components/error-boundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // You can also log the error to an error reporting service here
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-red-500 bg-red-900/20 border border-red-800 rounded-lg">
          <AlertCircle className="h-12 w-12 mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <p className="text-sm">
            We're sorry for the inconvenience. Please try refreshing the page or contact support.
          </p>
          {this.state.error && (
            <details className="mt-4 text-xs text-red-300">
              <summary>Error Details</summary>
              <pre className="mt-2 p-2 bg-red-900/40 rounded-md whitespace-pre-wrap break-all text-left">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

