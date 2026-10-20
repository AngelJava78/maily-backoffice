import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { can, hasAnythingToSee, useGrantedAccess, useOperatorIdentity } from '@/features/auth';
import {
  DashboardPermissionNotice,
  DashboardSummary,
  useForgetDashboardSummary,
} from '@/features/dashboard';
import { messages } from '@/shared/messages/es';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

/**
 * The Panel, the landing page (feature 007): its heading and the greeting of the operator, and
 * below them what the permissions allow (data-model.md, «Página principal»): the summary of the
 * platform for whoever has `dashboard:read`, refreshed every `dashboardRefreshMs`; a notice that the
 * indicators cannot be seen for whoever can see something else (FR-011); and, for whoever has no
 * permission at all, the notice that their roles give none yet (FR-012).
 */
export function HomePage({ dashboardRefreshMs }: { readonly dashboardRefreshMs: number }) {
  const access = useGrantedAccess();
  const { displayName } = useOperatorIdentity();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const canReadIndicators = can(access, { resource: 'dashboard', action: 'read' });
  // Losing the permission discards the data of the session too (FR-014).
  useForgetDashboardSummary(!canReadIndicators);

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
          {messages.home.title}
        </Typography>
        <Typography component="p" sx={{ overflowWrap: 'anywhere' }}>
          {messages.home.greeting(displayName)}
        </Typography>
      </Stack>
      {canReadIndicators ? (
        <DashboardSummary refreshIntervalMs={dashboardRefreshMs} />
      ) : hasAnythingToSee(access) ? (
        <DashboardPermissionNotice />
      ) : (
        <Alert severity="info">
          <AlertTitle>{messages.home.noPermissionsTitle}</AlertTitle>
          {messages.home.noPermissionsNotice}
        </Alert>
      )}
    </Stack>
  );
}
