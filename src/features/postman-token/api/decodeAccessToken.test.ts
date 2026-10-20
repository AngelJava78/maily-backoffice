import { describe, expect, it } from 'vitest';

import { fakeAccessToken } from '@/test/accessToken';

import { decodeAccessToken } from './decodeAccessToken';
import { TokenRequestError } from './tokenFailure';

function encode(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A token whose payload is exactly this text, whatever it is. */
function tokenWithPayload(payload: string): string {
  return `${encode('{"alg":"RS256","typ":"JWT"}')}.${encode(payload)}.${encode('signature')}`;
}

function failureOf(token: string): TokenRequestError {
  try {
    decodeAccessToken(token);
  } catch (error) {
    if (error instanceof TokenRequestError) {
      return error;
    }
    throw error;
  }
  throw new Error('decodeAccessToken should have failed');
}

describe('decodeAccessToken', () => {
  it('returns the token and its expiration as an ISO 8601 UTC text (data-model IssuedToken)', () => {
    const token = fakeAccessToken({ exp: 1_900_000_000 });

    expect(decodeAccessToken(token)).toEqual({
      value: token,
      expiresAt: '2030-03-17T17:46:40.000Z',
    });
  });

  it('keeps nothing of the payload except the expiration', () => {
    const decoded = decodeAccessToken(
      fakeAccessToken({
        exp: 1_900_000_000,
        sub: 'auth0|ana',
        aud: ['https://api'],
        scope: 'openid',
      }),
    );

    expect(Object.keys(decoded).sort()).toEqual(['expiresAt', 'value']);
  });

  it('reads a payload with characters that are not ASCII', () => {
    const decoded = decodeAccessToken(fakeAccessToken({ exp: 1_900_000_000, name: 'Ñandú ✓' }));

    expect(decoded.expiresAt).toBe('2030-03-17T17:46:40.000Z');
  });

  it.each([
    ['an empty text', ''],
    ['text with no dots', 'abc'],
    ['two parts', 'a.b'],
    ['four parts', 'a.b.c.d'],
    ['an empty payload', 'a..c'],
    ['a payload that is not base64url', 'a.@@@.c'],
    ['a payload that is not JSON', tokenWithPayload('not json')],
    ['a payload that is a text', tokenWithPayload('"text"')],
    ['a payload that is a list', tokenWithPayload('[1]')],
    ['a payload that is null', tokenWithPayload('null')],
    ['a payload without exp', tokenWithPayload('{}')],
    ['exp 0', tokenWithPayload('{"exp":0}')],
    ['a negative exp', tokenWithPayload('{"exp":-5}')],
    ['a fractional exp', tokenWithPayload('{"exp":1.5}')],
    ['an exp written as text', tokenWithPayload('{"exp":"1900000000"}')],
    ['a null exp', tokenWithPayload('{"exp":null}')],
    ['an exp that is not a valid date', tokenWithPayload('{"exp":1e20}')],
  ])('fails closed on %s, as a token that cannot be read', (_label, token) => {
    const failure = failureOf(token);

    expect(failure.kind).toBe('unreadable-token');
    if (token !== '') {
      expect(failure.message).not.toContain(token);
    }
  });
});
