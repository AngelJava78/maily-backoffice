import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

/**
 * Wraps a screen of a section that needs more than reading it (such as creating a user or editing
 * a subscription). Without the capability, or if it is taken away while the person is inside, they
 * go back to `to`, replacing the entry, with a notice (FR-015 of 002, FR-013 of 003). The API still
 * has the last word with its 403.
 */
export function RequireCapability({
  allowed,
  to,
  children,
}: {
  readonly allowed: boolean;
  readonly to: string;
  readonly children: ReactNode;
}) {
  const notify = useNotify();

  useEffect(() => {
    if (!allowed) {
      notify({ severity: 'info', message: messages.forbidden.action });
    }
  }, [allowed, notify]);

  return allowed ? <>{children}</> : <Navigate to={to} replace />;
}
