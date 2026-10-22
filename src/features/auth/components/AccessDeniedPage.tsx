import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';
import { useDocumentTitle } from '@/shared/ui/useDocumentTitle';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { LogoutButton } from './LogoutButton';

interface AccessDeniedPageProps {
  /** E-mail to show in "Iniciaste sesión como" (FR-014): the MailySoft user's, or the Auth0
   * account's when there is no user; `null` when there is neither. */
  readonly email: string | null;
  /** FR-015: the URL of "Ir a MailySoft", from the environment; `undefined` hides the link. */
  readonly mailySoftAppUrl: string | undefined;
}

/**
 * "Sin acceso" (feature 006, FR-011 to FR-017): shown instead of the Backoffice to anyone who
 * signed in but has no role of type Sistema. A single title and message for every reason — not
 * registered, account not Active, or no role of type Sistema — because none of that changes what
 * the person can do about it. It shows nothing about the person beyond the account they used: no
 * name, no link to the profile, no menu, no header, and no data from any other API (FR-012).
 */
export function AccessDeniedPage({ email, mailySoftAppUrl }: AccessDeniedPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  useDocumentTitle(messages.denied.tabTitle);

  return (
    <Container component="main" maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
          {messages.denied.title}
        </Typography>
        <Alert severity="warning">{messages.denied.message}</Alert>
        {email !== null && (
          <Typography sx={{ overflowWrap: 'anywhere' }}>
            {messages.denied.signedInAs(email)}
          </Typography>
        )}
        <Stack
          direction="row"
          useFlexGap
          spacing={2}
          sx={{ flexWrap: 'wrap', alignItems: 'center' }}
        >
          <LogoutButton color="primary" />
          {mailySoftAppUrl !== undefined && (
            <Link href={mailySoftAppUrl}>{messages.denied.goToMailySoft}</Link>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
