import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

import { useGrantedAccess } from '../hooks/useGrantedAccess';
import { can, type SectionResource } from './permissions';

/**
 * Wraps the routes of a section. Seeing a section needs the `read` permission of its resource; when
 * the person does not have it, or it is taken away while they are inside (FR-021), they are sent
 * to the home page with a notice: the common one, or the one the section brings (the Token tool
 * says so in its own words, feature 005).
 */
export function RequirePermission({
  resource,
  deniedNotice = messages.home.permissionsChanged,
  children,
}: {
  readonly resource: SectionResource;
  /** What to tell whoever cannot read the resource; the common notice unless given. */
  readonly deniedNotice?: string;
  readonly children: ReactNode;
}) {
  const access = useGrantedAccess();
  const notify = useNotify();
  const allowed = can(access, { resource, action: 'read' });

  useEffect(() => {
    if (!allowed) {
      notify({ severity: 'info', message: deniedNotice });
    }
  }, [allowed, deniedNotice, notify]);

  return allowed ? <>{children}</> : <Navigate to="/" replace />;
}
