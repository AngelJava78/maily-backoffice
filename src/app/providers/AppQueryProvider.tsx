import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

import { createQueryClient } from './createQueryClient';

/**
 * TanStack Query for the whole application. A request refused with 403 shows a notice and leaves
 * the session alone: the person is signed in, they just may not do that (FR-014).
 */
export function AppQueryProvider({ children }: { readonly children: ReactNode }) {
  const notify = useNotify();
  const [queryClient] = useState(() =>
    createQueryClient({
      onForbidden: () => {
        notify({ severity: 'warning', message: messages.forbidden.action });
      },
    }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
