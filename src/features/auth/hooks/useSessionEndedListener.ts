import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAnnounceSessionNotice, useSessionChannel } from './sessionContext';

/**
 * When another tab ends the session, this one discards its local session without redirecting
 * (Auth0 already ended its session) and empties the cache (US3-4). It does not navigate: the route
 * guard sees there is no session and sends the person to the access screen, which says why if the
 * other tab was closed for inactivity (FR-020).
 */
export function useSessionEndedListener(): void {
  const channel = useSessionChannel();
  const queryClient = useQueryClient();
  const { logout } = useAuth0();
  const announce = useAnnounceSessionNotice();

  useEffect(
    () =>
      channel.subscribe((message) => {
        if (message.type !== 'session-ended') {
          return;
        }
        if (message.reason === 'idle') {
          announce('idle');
        }
        void (async () => {
          await logout({ openUrl: false });
          queryClient.clear();
        })();
      }),
    [channel, logout, queryClient, announce],
  );
}
