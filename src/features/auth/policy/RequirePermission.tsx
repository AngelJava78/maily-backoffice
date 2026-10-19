import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

import { useGrantedAccess } from '../hooks/useGrantedAccess';
import { can, type SectionResource } from './permissions';

/**
 * Wraps the routes of a section. Seeing a section needs the `read` permission of its resource; when
 * the person does not have it, or it is taken away while they are inside (FR-021), they are sent
 * to the home page with a notice.
 */
export function RequirePermission({
  resource,
  children,
}: {
  readonly resource: SectionResource;
  readonly children: ReactNode;
}) {
  const access = useGrantedAccess();
  const notify = useNotify();
  const allowed = can(access, { resource, action: 'read' });

  useEffect(() => {
    if (!allowed) {
      notify({ severity: 'info', message: messages.home.permissionsChanged });
    }
  }, [allowed, notify]);

  return allowed ? <>{children}</> : <Navigate to="/" replace />;
}
