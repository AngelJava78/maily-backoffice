import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

import { healthKeys } from '../hooks/healthKeys';

/**
 * A component that does not exist any more, because another person deleted it (FR-039, US3-13):
 * «Este componente ya no existe.» and back to the list, asked for again so it no longer shows it.
 */
export function ComponentGone({ componentId }: { readonly componentId: string }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  // Told once, also when the effects run twice in development.
  const told = useRef(false);

  useEffect(() => {
    if (told.current) {
      return;
    }
    told.current = true;
    notify({ severity: 'warning', message: messages.health.registry.errors.notFound });
    queryClient.removeQueries({ queryKey: healthKeys.componentDetail(componentId), exact: true });
    void queryClient.invalidateQueries({ queryKey: healthKeys.componentsList(), exact: true });
  }, [componentId, notify, queryClient]);

  return <Navigate to="/health/components" replace />;
}
