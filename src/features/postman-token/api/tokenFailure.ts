import { mapAuth0TokenError } from '@/features/auth';
import { SessionExpiredError } from '@/shared/api/ApiError';

/**
 * How getting the token can fail (data-model.md, `TokenFailureKind`):
 * - `session-expired`: Auth0 says the session is over (`login_required`, `consent_required`,
 *   `invalid_grant`, no refresh token, or the SDK gave up waiting).
 * - `unreadable-token`: Auth0 answered with something that is not a token with a readable `exp`.
 * - `unknown`: any other error (network, Auth0 down, something unexpected).
 */
export type TokenFailureKind = 'session-expired' | 'unreadable-token' | 'unknown';

/**
 * The failure of `requestAccessToken`. Its message is fixed on purpose: neither the token nor what
 * the SDK said can reach a screen or a log through it. The original error stays in `cause`.
 * `scripts/check-entry-size.mjs` looks for the literal name below to be sure that this module is
 * not in the entry route: change both together.
 */
export class TokenRequestError extends Error {
  readonly kind: TokenFailureKind;

  constructor(kind: TokenFailureKind, options?: ErrorOptions) {
    super('The access token could not be obtained', options);
    this.name = 'TokenRequestError';
    this.kind = kind;
  }
}

/** The kind of failure of whatever was thrown while getting the token. */
export function classifyTokenError(error: unknown): TokenFailureKind {
  if (error instanceof TokenRequestError) {
    return error.kind;
  }
  return mapAuth0TokenError(error) instanceof SessionExpiredError ? 'session-expired' : 'unknown';
}
