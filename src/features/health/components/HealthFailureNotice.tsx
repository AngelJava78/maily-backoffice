import Alert from '@mui/material/Alert';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { RefreshFailedAlert } from '@/shared/ui/RefreshFailedAlert';

const text = messages.health.page;

/** The message of a failure, with the possible cause when the permission could not be checked. */
function withCause(message: string, authorizationUnavailable: boolean): string {
  return authorizationUnavailable ? `${message} ${text.authorizationUnavailable}` : message;
}

/**
 * The first load failed (FR-030): what happened and «Reintentar». When the service could not check
 * the permission (503), it adds the possible cause: mailySoft-usuarios or the database not
 * available, for instance outside their schedule (research D8).
 */
export function HealthLoadFailure({
  authorizationUnavailable,
  onRetry,
}: {
  readonly authorizationUnavailable: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <ErrorState
      title={text.loadError.title}
      message={withCause(text.loadError.message, authorizationUnavailable)}
      onRetry={onRetry}
    />
  );
}

/**
 * A refresh failed while there is data on screen (FR-030): the data stays, with its age, and this
 * notice is announced once. It stays mounted while the next cycles fail too, so it is not announced
 * again, and goes away when one works (research D11). The next cycle tries again by itself.
 */
export function HealthRefreshFailed({
  authorizationUnavailable,
}: {
  readonly authorizationUnavailable: boolean;
}) {
  return <RefreshFailedAlert message={withCause(text.refreshFailed, authorizationUnavailable)} />;
}

/**
 * The service refused the health of the services to this person (FR-031): announced once, with no
 * action, because the page asks nothing more in this visit.
 */
export function HealthPermissionNotice() {
  return <Alert severity="info">{text.noPermission}</Alert>;
}
