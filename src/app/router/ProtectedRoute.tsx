import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, Outlet, useLocation } from 'react-router';

import {
  SessionWatchers,
  useOperatorAccess,
  type AccessLocationState,
  type OperatorAccessState,
} from '@/features/auth';
import { PageLoader } from '@/shared/ui/PageLoader';

import { AccessCheckFailedScreen } from './AccessCheckFailedScreen';

/** What to show for a person who has a session, according to what is known about their access. */
function ProtectedContent({ access }: { readonly access: OperatorAccessState }) {
  switch (access.status) {
    case 'resolving':
      return <PageLoader />;
    // feature 006, FR-018: "Sin acceso" has its own address now, so it is reached by navigating
    // there instead of being drawn in the place of whatever route was requested.
    case 'denied':
      return <Navigate to="/access-denied" replace />;
    case 'failed':
      return <AccessCheckFailedScreen access={access} />;
    case 'granted':
      return <Outlet />;
  }
}

/**
 * Guard of everything that needs a session. It decides, in this order and showing nothing
 * protected until the last step: wait for Auth0, send to the access screen without a session,
 * wait for the access to be resolved, and only then render the routes below it (fail closed).
 *
 * It is the only place that redirects when the session is over, whatever the reason (logging out
 * in another tab, an expired session, inactivity), and it keeps watch over the session in every
 * state in which there is one, including the screens that deny the access.
 */
export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth0();
  const location = useLocation();
  const access = useOperatorAccess();

  if (isLoading) {
    return <PageLoader />;
  }
  if (!isAuthenticated) {
    const state: AccessLocationState = { returnTo: location.pathname + location.search };
    return <Navigate to="/access" replace state={state} />;
  }

  return (
    <>
      <SessionWatchers />
      <ProtectedContent access={access} />
    </>
  );
}
