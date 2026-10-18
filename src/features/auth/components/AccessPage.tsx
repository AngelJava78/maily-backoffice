import { useAuth0 } from '@auth0/auth0-react';
import Alert, { type AlertColor } from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { messages } from '@/shared/messages/es';
import { PageLoader } from '@/shared/ui/PageLoader';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useSessionNotice } from '../hooks/sessionContext';
import { readAccessLocationState, type AccessNotice } from '../session/accessLocationState';
import { consumeReturnPath } from '../session/returnPathStorage';

const NOTICE_SEVERITY: Readonly<Record<AccessNotice, AlertColor>> = {
  idle: 'info',
  expired: 'info',
  cancelled: 'info',
  idpError: 'error',
};

interface SignInPromptProps {
  readonly notice: AccessNotice | undefined;
  readonly onSignIn: () => void;
}

function SignInPrompt({ notice, onSignIn }: SignInPromptProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.access.title}
      </Typography>
      {notice !== undefined && (
        <Alert severity={NOTICE_SEVERITY[notice]}>{messages.access.notices[notice]}</Alert>
      )}
      <Typography>{messages.access.description}</Typography>
      <Button variant="contained" size="large" onClick={onSignIn}>
        {messages.access.loginButton}
      </Button>
    </Stack>
  );
}

/**
 * The entry door: a single button that sends the person to Auth0, where the credentials are
 * typed (FR-002, FR-007). Someone who already has a session goes to the home page instead, where
 * the route guard decides what they may see. With `idle` it is the destination of the logout for
 * inactivity: it says so, and brings the person back to the screen they were on, which it reads
 * once from storage (FR-020).
 */
export function AccessPage({ idle = false }: { readonly idle?: boolean }) {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();
  const location = useLocation();
  const [rememberedPath] = useState(() => (idle ? consumeReturnPath() : null));
  const state = readAccessLocationState(location.state);
  const sessionNotice = useSessionNotice();
  const returnTo = rememberedPath ?? state.returnTo;
  const notice = idle ? 'idle' : (sessionNotice ?? state.notice);

  if (isLoading) {
    return <PageLoader />;
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return (
    <SignInPrompt
      notice={notice}
      onSignIn={() => {
        void loginWithRedirect({ appState: { returnTo } });
      }}
    />
  );
}
