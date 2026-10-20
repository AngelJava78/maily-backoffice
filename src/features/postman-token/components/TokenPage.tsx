import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSessionExpiry } from '@/features/auth';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { LiveStatus } from '@/shared/ui/LiveStatus';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useAccessToken } from '../hooks/useAccessToken';
import { useCopyToken } from '../hooks/useCopyToken';
import { TokenExpiry } from './TokenExpiry';
import { TokenFailureAlert } from './TokenFailureAlert';
import { TokenValue } from './TokenValue';

/**
 * The Token tool (feature 005): it opens empty with "Generar"; the button asks Auth0 for a new
 * access token of the person, which appears hidden with its expiry and the buttons to show, hide
 * and copy it, and "Generar" becomes "Refrescar", which repeats the process. The token lives only
 * in the state of this screen. Nothing here decides who can open it: the route does (FR-001).
 */
export function TokenPage() {
  const text = messages.token;
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { token, revealed, isPending, failure, isExpired, request, toggleReveal } =
    useAccessToken();
  const copy = useCopyToken();
  const expireSession = useSessionExpiry();

  // What a screen reader hears: that a token arrived, and later that it expired.
  let announcement = '';
  if (token !== null) {
    announcement = isExpired
      ? text.announce.expired
      : text.announce.generated(formatDateTime(token.expiresAt));
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {text.title}
      </Typography>

      <Alert severity="warning" role="note">
        {text.warning}
      </Alert>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={3}>
          <TokenValue
            token={token}
            revealed={revealed}
            canCopy={token !== null && !isExpired}
            onToggleReveal={toggleReveal}
            onCopy={() => {
              if (token !== null) {
                void copy(token.value);
              }
            }}
          />
          <TokenExpiry expiresAt={token?.expiresAt ?? null} expired={isExpired} />
          <Box>
            <Button variant="contained" loading={isPending} onClick={request}>
              {token === null ? text.actions.generate : text.actions.refresh}
            </Button>
          </Box>
          {failure !== null && (
            <TokenFailureAlert
              kind={failure}
              onRetry={request}
              onSignInAgain={() => {
                void expireSession();
              }}
            />
          )}
        </Stack>
      </Paper>

      <LiveStatus>{announcement}</LiveStatus>
    </Stack>
  );
}
