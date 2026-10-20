import { describe, expect, it } from 'vitest';

import { accessTokenClaimsSchema } from './accessToken';

describe('accessTokenClaimsSchema', () => {
  it('accepts a positive whole exp, which is in seconds since the Unix epoch', () => {
    expect(accessTokenClaimsSchema.parse({ exp: 1_900_000_000 })).toEqual({ exp: 1_900_000_000 });
  });

  it('discards every claim other than exp (research D6)', () => {
    const parsed = accessTokenClaimsSchema.parse({
      exp: 1_900_000_000,
      sub: 'auth0|ana',
      aud: ['https://api'],
      scope: 'openid',
    });

    expect(parsed).toStrictEqual({ exp: 1_900_000_000 });
  });

  it.each([
    ['without exp', {}],
    ['exp 0', { exp: 0 }],
    ['a negative exp', { exp: -5 }],
    ['a fractional exp', { exp: 1.5 }],
    ['an exp written as text', { exp: '1900000000' }],
    ['a null exp', { exp: null }],
    ['an exp that is NaN', { exp: Number.NaN }],
    ['an infinite exp', { exp: Number.POSITIVE_INFINITY }],
  ])('rejects %s', (_label, claims) => {
    expect(accessTokenClaimsSchema.safeParse(claims).success).toBe(false);
  });
});
