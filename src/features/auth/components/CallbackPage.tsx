import { useAuth0 } from '@auth0/auth0-react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { messages } from '@/shared/messages/es';
import { PageLoader } from '@/shared/ui/PageLoader';

import type { AccessLocationState } from '../session/accessLocationState';

/** Auth0 reports that the person cancelled or refused with the OAuth code `access_denied`. */
const accessDeniedSchema = z.object({ error: z.literal('access_denied') });

/**
 * Where the sign-in comes back from Auth0. The SDK finishes it by itself and takes the person to
 * the address they were heading to; this screen only shows progress, or sends them to the access
 * screen with a notice when the provider reports an error (FR-015). It never shows protected data.
 *
 * The SDK stops loading and asks the router to move on in the same step, but React shows the SDK
 * update first. The code and state of the URL tell that the router has not moved yet, so this
 * screen keeps waiting instead of sending the person to the home page and losing the address they
 * were heading to. Without them nobody is coming back from Auth0 (the address was typed by hand).
 */
export function CallbackPage() {
  const { isLoading, error } = useAuth0();
  const [searchParams] = useSearchParams();
  const isBeingCompleted = searchParams.has('code') && searchParams.has('state');

  if (error !== undefined) {
    const state: AccessLocationState = {
      notice: accessDeniedSchema.safeParse(error).success ? 'cancelled' : 'idpError',
    };
    return <Navigate to="/access" replace state={state} />;
  }
  if (!isLoading && !isBeingCompleted) {
    return <Navigate to="/" replace />;
  }
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
      <PageLoader />
      <Typography>{messages.callback.progress}</Typography>
    </Stack>
  );
}
