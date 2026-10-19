import { MissingRefreshTokenError, TimeoutError } from '@auth0/auth0-react';
import { z } from 'zod';

import { SessionExpiredError } from '@/shared/api/ApiError';

/** Codes with which Auth0 says that the session cannot be renewed without signing in again. */
const expiredSessionSchema = z.object({
  error: z.enum(['login_required', 'consent_required', 'invalid_grant']),
});

/**
 * Turns the errors of the Auth0 SDK that mean "the session is over" into `SessionExpiredError`
 * (contracts/auth0-configuration.md), keeping the original as the cause. Any other error goes
 * through untouched.
 */
export function mapAuth0TokenError(error: unknown): unknown {
  if (
    error instanceof MissingRefreshTokenError ||
    error instanceof TimeoutError ||
    expiredSessionSchema.safeParse(error).success
  ) {
    return new SessionExpiredError({ cause: error });
  }
  return error;
}
