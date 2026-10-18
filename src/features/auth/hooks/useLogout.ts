import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useLocation } from 'react-router';

import type { SessionEndedMessage } from '@/shared/lib/sessionChannel';

import { saveReturnPath } from '../session/returnPathStorage';
import { useSessionChannel } from './sessionContext';

/** Why the session is being ended by this tab. */
export type LogoutReason = SessionEndedMessage['reason'];

/**
 * Returns the function that ends the session: it tells the other tabs, empties the cache so no
 * data stays in memory and ends the session at Auth0 too (FR-010, FR-011). A voluntary logout comes
 * back to the access screen; one for inactivity first remembers the current screen and comes back
 * to the inactivity notice, so that signing in brings the person back to where they were (FR-020).
 */
export function useLogout(): (reason?: LogoutReason) => Promise<void> {
  const queryClient = useQueryClient();
  const { logout } = useAuth0();
  const channel = useSessionChannel();
  const location = useLocation();

  return useCallback(
    async (reason = 'logout') => {
      if (reason === 'idle') {
        saveReturnPath(location);
      }
      channel.post({ type: 'session-ended', reason });
      queryClient.clear();
      const returnPath = reason === 'idle' ? '/access/idle' : '/access';
      await logout({ logoutParams: { returnTo: `${window.location.origin}${returnPath}` } });
    },
    [channel, queryClient, logout, location],
  );
}
