// backend/src/components/error-boundary.tsx
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
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] h-full p-6 text-center glass-panel border border-red-500/30 rounded-xl bg-red-500/5">
          <AlertCircle className="h-12 w-12 mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2 text-red-500 font-headline">Something went wrong.</h2>
          <p className="text-sm text-white/60 max-w-md">
            We're sorry for the inconvenience. Pandora encountered an unexpected error.
            Please try refreshing the page or contact support if the issue persists.
          </p>
          {this.state.error && (
            <div className="mt-6 w-full max-w-2xl">
              <details className="text-xs text-red-400 cursor-pointer">
                <summary className="hover:text-red-300 transition-colors">Error Details</summary>
                <pre className="mt-2 p-4 bg-black/40 border border-red-500/20 rounded-lg whitespace-pre-wrap break-all text-left font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
          >
            Reload Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

