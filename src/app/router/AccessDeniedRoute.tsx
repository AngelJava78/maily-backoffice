import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, useLocation } from 'react-router';

import {
  AccessCheckFailedPage,
  AccessDeniedPage,
  SessionWatchers,
  useOperatorAccess,
  type AccessLocationState,
  type OperatorAccessState,
} from '@/features/auth';
import { PageLoader } from '@/shared/ui/PageLoader';

import { useAppSettings } from '../providers/AppSettingsProvider';

/** What to show once there is a session, according to what is known about the access. */
function AccessDeniedContent({
  access,
  mailySoftAppUrl,
}: {
  readonly access: OperatorAccessState;
  readonly mailySoftAppUrl: string | undefined;
}) {
  switch (access.status) {
    case 'resolving':
      return <PageLoader />;
    case 'failed':
      return <AccessCheckFailedPage refetch={access.refetch} email={access.accountEmail} />;
    case 'granted':
      return <Navigate to="/" replace />;
    case 'denied':
      return <AccessDeniedPage email={access.accountEmail} mailySoftAppUrl={mailySoftAppUrl} />;
  }
}

/**
 * "Sin acceso" as its own address (feature 006, FR-011, FR-018 to FR-021): it repeats the small
 * guard of `ProtectedRoute` (wait for Auth0, send to the access screen without a session) instead
 * of sharing its switch, because this screen must show its content when access is *denied*, the
 * opposite of what `ProtectedRoute` does with `Outlet` — the same reason `AccessPage` already
 * guards itself this way instead of going through `ProtectedRoute` (research D4 of feature 006).
 */
export function AccessDeniedRoute() {
  const { isLoading, isAuthenticated } = useAuth0();
  const location = useLocation();
  const access = useOperatorAccess();
  const { mailySoftAppUrl } = useAppSettings();

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
      <AccessDeniedContent access={access} mailySoftAppUrl={mailySoftAppUrl} />
    </>
  );
}
