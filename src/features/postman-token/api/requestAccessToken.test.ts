import { GenericError, MissingRefreshTokenError, TimeoutError } from '@auth0/auth0-react';
import { describe, expect, it, vi } from 'vitest';

import { fakeAccessToken, FAKE_TOKEN_EXP } from '@/test/accessToken';

import { requestAccessToken, type GetAccessToken } from './requestAccessToken';
import { TokenRequestError } from './tokenFailure';

async function failureOf(getToken: GetAccessToken): Promise<TokenRequestError> {
  try {
    await requestAccessToken(getToken);
  } catch (error) {
    if (error instanceof TokenRequestError) {
      return error;
    }
    throw error;
  }
  throw new Error('requestAccessToken should have failed');
}

describe('requestAccessToken', () => {
  it('asks the SDK once, for a new token, and returns it with its expiration', async () => {
    const token = fakeAccessToken({ exp: FAKE_TOKEN_EXP });
    const getToken = vi.fn<GetAccessToken>().mockResolvedValue(token);

    await expect(requestAccessToken(getToken)).resolves.toEqual({
      value: token,
      expiresAt: '2030-03-17T17:46:40.000Z',
    });
    expect(getToken).toHaveBeenCalledExactlyOnceWith({ cacheMode: 'off' });
  });

  it.each([
    ['login_required', new GenericError('login_required', 'Login required')],
    ['a missing refresh token', new MissingRefreshTokenError('https://mailysoft-apis', 'openid')],
    ['a time-out of the SDK', new TimeoutError()],
  ])('turns %s into a session that ended, keeping the cause', async (_label, cause) => {
    const failure = await failureOf(vi.fn<GetAccessToken>().mockRejectedValue(cause));

    expect(failure.kind).toBe('session-expired');
    expect(failure.cause).toBe(cause);
  });

  it.each([
    ['a generic error', new Error('boom')],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('turns %s into an unknown failure', async (_label, cause) => {
    const failure = await failureOf(vi.fn<GetAccessToken>().mockRejectedValue(cause));

    expect(failure.kind).toBe('unknown');
    expect(failure.cause).toBe(cause);
  });

  it.each([
    ['text that is not a token', 'no-es-un-jwt'],
    ['an empty text', ''],
    ['nothing', undefined],
  ])('treats %s from the SDK as a token that cannot be read', async (_label, result) => {
    const failure = await failureOf(vi.fn<GetAccessToken>().mockResolvedValue(result));

    expect(failure.kind).toBe('unreadable-token');
  });

  it('never puts the token or the message of the SDK in the message of the error', async () => {
    const token = fakeAccessToken({ exp: 0 });
    const unreadable = await failureOf(vi.fn<GetAccessToken>().mockResolvedValue(token));
    const rejected = await failureOf(
      vi.fn<GetAccessToken>().mockRejectedValue(new Error('detail of the SDK')),
    );

    expect(unreadable.message).not.toContain(token);
    expect(rejected.message).not.toContain('detail');
  });
});
