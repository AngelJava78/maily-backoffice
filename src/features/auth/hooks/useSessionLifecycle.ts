import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { useLocation } from 'react-router';

import { IDLE_PROMPT_BEFORE_MS, IDLE_TIMEOUT_MS } from '../config/session';
import { useSessionChannel } from './sessionContext';
import { useLogout } from './useLogout';

/** At most one activity notice per second goes to the other tabs. */
const ACTIVITY_BROADCAST_THROTTLE_MS = 1_000;

export interface SessionLifecycle {
  /** The warning that the session is about to close is open. */
  readonly isPrompted: boolean;
  /** Milliseconds left before the session closes for inactivity. */
  readonly getRemainingTimeMs: () => number;
  /** The person wants to stay: starts counting again. */
  readonly continueSession: () => void;
}

/**
 * Closes the session after 15 minutes without activity, warning one minute before (FR-020). Only a
 * press of the mouse, a key or a touch counts as activity, and so does moving to another screen;
 * moving the mouse, scrolling and the automatic re-checks of the access do not.
 *
 * With several tabs open, the activity of each one counts for all: it is told over the session
 * channel, so a tab being used keeps the others open. The timer library's own `crossTab` mode is
 * not used because it waits for every tab it ever saw to go idle, and a tab that the browser
 * discards or freezes never says so, which would keep the session open forever.
 */
export function useSessionLifecycle(): SessionLifecycle {
  const { isAuthenticated } = useAuth0();
  const logout = useLogout();
  const channel = useSessionChannel();
  const location = useLocation();
  const [isPrompted, setIsPrompted] = useState(false);

  // The methods of the idle timer are closures that never use `this`.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { activate, getRemainingTime } = useIdleTimer({
    timeout: IDLE_TIMEOUT_MS,
    promptBeforeIdle: IDLE_PROMPT_BEFORE_MS,
    events: ['mousedown', 'keydown', 'touchstart'],
    stopOnIdle: true,
    disabled: !isAuthenticated,
    throttle: ACTIVITY_BROADCAST_THROTTLE_MS,
    onAction: () => {
      channel.post({ type: 'activity' });
    },
    onPrompt: () => {
      setIsPrompted(true);
    },
    onActive: () => {
      setIsPrompted(false);
    },
    onIdle: () => {
      setIsPrompted(false);
      void logout('idle');
    },
  });

  // Activity in another tab is activity here too.
  useEffect(
    () =>
      channel.subscribe((message) => {
        if (message.type === 'activity') {
          activate();
        }
      }),
    [channel, activate],
  );

  // Going to another screen is activity: it synchronizes the timer with the router.
  useEffect(() => {
    activate();
  }, [location.key, activate]);

  return {
    isPrompted,
    getRemainingTimeMs: getRemainingTime,
    continueSession: () => {
      activate();
      channel.post({ type: 'activity' });
    },
  };
}
