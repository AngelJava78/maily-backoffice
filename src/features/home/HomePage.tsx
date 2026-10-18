import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { hasAnySectionPermission, useGrantedAccess, useOperatorIdentity } from '@/features/auth';
import { messages } from '@/shared/messages/es';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

/** The landing page: greets the operator and warns when their roles give no permissions yet. */
export function HomePage() {
  const access = useGrantedAccess();
  const { displayName } = useOperatorIdentity();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <Stack spacing={3}>
      <Typography
        variant="h4"
        component="h1"
        ref={headingRef}
        tabIndex={-1}
        sx={{ overflowWrap: 'anywhere' }}
      >
        {messages.home.greeting(displayName)}
      </Typography>
      {!hasAnySectionPermission(access) && (
        <Alert severity="info">
          <AlertTitle>{messages.home.noPermissionsTitle}</AlertTitle>
          {messages.home.noPermissionsNotice}
        </Alert>
      )}
    </Stack>
  );
}
