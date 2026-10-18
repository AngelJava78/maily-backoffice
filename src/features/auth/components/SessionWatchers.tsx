import { useSessionEndedListener } from '../hooks/useSessionEndedListener';
import { SessionLifecycle } from './SessionLifecycle';

/**
 * Everything that watches over a session that exists: the closing of the session in other tabs
 * and the inactivity of the person. The route guard renders it whenever there is a session, so it
 * also covers the access denied and check failed screens, whose Auth0 session is as real as any.
 */
export function SessionWatchers() {
  useSessionEndedListener();
  return <SessionLifecycle />;
}
