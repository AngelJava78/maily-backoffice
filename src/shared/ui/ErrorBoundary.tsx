import { Component, type ErrorInfo, type ReactNode } from 'react';

import { logger } from '@/shared/lib/logger';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /** What to show in place of the children once one of them throws while rendering. */
  readonly fallback: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * The only class component of the project: React has no hook to catch rendering errors
 * (constitution I). It logs the error through the logger and shows the fallback.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('A rendering error reached an error boundary', {
      error,
      componentStack: info.componentStack,
    });
  }

  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
