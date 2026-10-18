import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { logger } from '@/shared/lib/logger';

import { useAnnounceSessionNotice } from './sessionContext';

/**
 * Returns the handler for a session that cannot go on (FR-013). It records that the access screen
 * has to say the session expired, discards the local session without redirecting and empties the
 * cache. It does not navigate: the route guard sees there is no session and sends the person to
 * the access screen with the address they were on, so two redirections never compete. The notice
 * does not travel in the router state because Auth0 may have forgotten the person already, and
 * the guard may have redirected, before this handler runs.
 *
 * It runs once however many requests report the expiry together, and is armed again when the
 * person signs in.
 */
export function useSessionExpiry(): () => Promise<void> {
  const { isAuthenticated, logout } = useAuth0();
  const queryClient = useQueryClient();
  const announce = useAnnounceSessionNotice();
  const handled = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      handled.current = false;
    }
  }, [isAuthenticated]);

  return useCallback(async () => {
    if (handled.current) {
      return;
    }
    handled.current = true;
    announce('expired');
    try {
      await logout({ openUrl: false });
      queryClient.clear();
    } catch (error) {
      logger.error('Could not close the expired session', { error });
    }
  }, [announce, logout, queryClient]);
}
