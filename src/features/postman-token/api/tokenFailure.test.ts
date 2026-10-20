import { GenericError, MissingRefreshTokenError, TimeoutError } from '@auth0/auth0-react';
import { describe, expect, it } from 'vitest';

import { SessionExpiredError } from '@/shared/api/ApiError';

import { classifyTokenError, TokenRequestError } from './tokenFailure';

describe('TokenRequestError', () => {
  it('is an Error that carries the kind of the failure and keeps the cause', () => {
    const cause = new Error('detail of the SDK');
    const error = new TokenRequestError('unknown', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TokenRequestError');
    expect(error.kind).toBe('unknown');
    expect(error.cause).toBe(cause);
  });

  it('has a fixed message that never repeats the one of the cause', () => {
    const first = new TokenRequestError('unknown', { cause: new Error('detail A') });
    const second = new TokenRequestError('session-expired', { cause: new Error('detail B') });

    expect(first.message).toBe(second.message);
    expect(first.message).not.toContain('detail');
  });
});

describe('classifyTokenError', () => {
  it.each([
    ['login_required', new GenericError('login_required', 'Login required')],
    ['consent_required', new GenericError('consent_required', 'Consent required')],
    ['invalid_grant', new GenericError('invalid_grant', 'Unknown or invalid refresh token')],
    ['a missing refresh token', new MissingRefreshTokenError('https://mailysoft-apis', 'openid')],
    ['a time-out of the SDK', new TimeoutError()],
    ['an expired session that was already mapped', new SessionExpiredError()],
  ])('classifies %s as a session that ended', (_label, error) => {
    expect(classifyTokenError(error)).toBe('session-expired');
  });

  it('keeps the kind of a TokenRequestError', () => {
    expect(classifyTokenError(new TokenRequestError('unreadable-token'))).toBe('unreadable-token');
    expect(classifyTokenError(new TokenRequestError('unknown'))).toBe('unknown');
    expect(classifyTokenError(new TokenRequestError('session-expired'))).toBe('session-expired');
  });

  it.each([
    ['an Auth0 error that does not end the session', new GenericError('mfa_required', 'MFA')],
    ['a network failure', new TypeError('Failed to fetch')],
    ['a generic error', new Error('boom')],
    ['text', 'login_required'],
    ['nothing', undefined],
  ])('classifies %s as unknown', (_label, error) => {
    expect(classifyTokenError(error)).toBe('unknown');
  });
});
