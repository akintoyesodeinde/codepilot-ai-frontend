'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected interface error occurred.',
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"
        >
          <div className="max-w-md rounded-xl border bg-[var(--card)] p-6 shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{this.state.message}</p>
            <Button
              className="mt-5"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reload application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
