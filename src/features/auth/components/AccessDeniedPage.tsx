import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';
import { useDocumentTitle } from '@/shared/ui/useDocumentTitle';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import type { AccessDeniedReason } from '../policy/types';
import { LogoutButton } from './LogoutButton';

const REASON_TEXT: Readonly<Record<AccessDeniedReason, string>> = {
  not_registered: messages.denied.reasons.notRegistered,
  inactive_account: messages.denied.reasons.inactiveAccount,
  no_authorized_role: messages.denied.reasons.noAuthorizedRole,
};

interface AccessDeniedPageProps {
  readonly reason: AccessDeniedReason;
  /** E-mail of the Auth0 account the person signed in with; the line is left out without it. */
  readonly email: string | null;
}

/**
 * Shown in place of the application to someone who signed in but may not enter (FR-004): the
 * reason, the account they used and the way out. It shows nothing about the person (no name, no
 * link to the profile), because it is not known yet that they are allowed to see any of it.
 */
export function AccessDeniedPage({ reason, email }: AccessDeniedPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  useDocumentTitle(messages.denied.title);

  return (
    <Container component="main" maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
          {messages.denied.title}
        </Typography>
        <Alert severity="warning">{REASON_TEXT[reason]}</Alert>
        {email !== null && (
          <Typography sx={{ overflowWrap: 'anywhere' }}>
            {messages.common.account(email)}
          </Typography>
        )}
        <div>
          <LogoutButton color="primary" />
        </div>
      </Stack>
    </Container>
  );
}
