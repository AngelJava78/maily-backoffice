import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { logger } from '@/shared/lib/logger';
import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';

/**
 * What a route shows when it fails to render: a friendly message where the page would have been,
 * so the layout around it (header, log out) stays usable. The error is logged without personal data.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    logger.error('A route failed', {
      error: isRouteErrorResponse(error)
        ? { name: 'RouteErrorResponse', message: `${error.status} ${error.statusText}` }
        : error,
    });
  }, [error]);

  return <ErrorState title={messages.errors.routeTitle} message={messages.errors.unexpected} />;
}
