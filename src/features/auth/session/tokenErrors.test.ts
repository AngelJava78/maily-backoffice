import {
  AuthenticationError,
  GenericError,
  MissingRefreshTokenError,
  OAuthError,
  TimeoutError,
} from '@auth0/auth0-react';
import { describe, expect, it } from 'vitest';

import { SessionExpiredError } from '@/shared/api/ApiError';

import { mapAuth0TokenError } from './tokenErrors';

describe('mapAuth0TokenError', () => {
  const expiredSession = [
    ['login_required', new GenericError('login_required', 'Login required')],
    ['consent_required', new GenericError('consent_required', 'Consent required')],
    ['invalid_grant', new GenericError('invalid_grant', 'Unknown or invalid refresh token')],
    ['invalid_grant from an authorization error', new AuthenticationError('invalid_grant', '', '')],
    ['an OAuth error with login_required', new OAuthError('login_required', 'Login required')],
    ['a missing refresh token', new MissingRefreshTokenError('https://mailysoft-apis', 'openid')],
    ['a time-out while renewing', new TimeoutError()],
  ] as const;

  it.each(expiredSession)(
    'turns %s into an expired session, keeping the cause',
    (_label, error) => {
      const mapped = mapAuth0TokenError(error);

      expect(mapped).toBeInstanceOf(SessionExpiredError);
      expect(mapped).toHaveProperty('cause', error);
    },
  );

  it.each([
    ['a generic error', new Error('boom')],
    ['an Auth0 error that does not end the session', new GenericError('mfa_required', 'MFA')],
    ['a network failure', new TypeError('Failed to fetch')],
    ['text', 'login_required'],
    ['nothing', undefined],
    ['null', null],
    ['an object with a different error code', { error: 'access_denied' }],
  ])('lets %s through unchanged', (_label, error) => {
    expect(mapAuth0TokenError(error)).toBe(error);
  });

  it('keeps the session expiry it already is', () => {
    const expired = new SessionExpiredError();

    expect(mapAuth0TokenError(expired)).toBe(expired);
  });
});
