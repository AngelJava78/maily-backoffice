import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import { messages } from '@/shared/messages/es';

const text = messages.dashboard.noPermission;

/**
 * What the Panel shows instead of the indicators to whoever may not see them: who lacks
 * `dashboard:read` (FR-011), and who the service refused although their permissions said otherwise
 * (FR-015).
 */
export function DashboardPermissionNotice() {
  return (
    <Alert severity="info">
      <AlertTitle>{text.title}</AlertTitle>
      {text.message}
    </Alert>
  );
}
