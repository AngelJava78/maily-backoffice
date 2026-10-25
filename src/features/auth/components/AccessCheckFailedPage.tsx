import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useDocumentTitle } from '@/shared/ui/useDocumentTitle';

import { LogoutButton } from './LogoutButton';

interface AccessCheckFailedPageProps {
  /** E-mail of the Auth0 account the person signed in with; the line is left out without it. */
  readonly email: string | null;
  /** Asks again whether the person may enter. */
  readonly refetch: () => void;
  /**
   * What the application adds below the line of the account (feature 016, FR-065): the status of
   * the platform. This screen does not know what it receives.
   */
  readonly children?: ReactNode;
}

/**
 * Shown when the access could not be checked and nothing was known before (FR-005): the person
 * can retry or leave, and sees nothing about themselves, as in the access denied screen.
 */
export function AccessCheckFailedPage({ email, refetch, children }: AccessCheckFailedPageProps) {
  useDocumentTitle(messages.checkFailed.title);

  return (
    <Container component="main" maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <ErrorState
          title={messages.checkFailed.title}
          titleComponent="h1"
          message={messages.checkFailed.message}
          onRetry={refetch}
          secondaryAction={<LogoutButton color="primary" />}
        />
        {email !== null && (
          <Typography sx={{ overflowWrap: 'anywhere' }}>
            {messages.common.account(email)}
          </Typography>
        )}
        {children}
      </Stack>
    </Container>
  );
}
