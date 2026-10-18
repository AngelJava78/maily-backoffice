import { describe, expect, it } from 'vitest';

import { operatorClaimsSchema } from './operatorClaims';

describe('operatorClaimsSchema', () => {
  it('keeps the subject and the e-mail of the Auth0 account', () => {
    expect(operatorClaimsSchema.parse({ sub: 'auth0|abc123', email: 'ana@clinica.com' })).toEqual({
      sub: 'auth0|abc123',
      email: 'ana@clinica.com',
    });
  });

  it('ignores every other claim', () => {
    const claims = operatorClaimsSchema.parse({
      sub: 'auth0|abc123',
      email: 'ana@clinica.com',
      name: 'Ana Pérez',
      picture: 'https://cdn.example.com/ana.png',
      email_verified: true,
      nickname: 'ana',
    });

    expect(claims).toEqual({ sub: 'auth0|abc123', email: 'ana@clinica.com' });
  });

  it('treats the e-mail as optional', () => {
    const claims = operatorClaimsSchema.parse({ sub: 'auth0|abc123' });

    expect(claims.sub).toBe('auth0|abc123');
    expect(claims.email).toBeUndefined();
  });

  it.each([
    ['a missing sub', { email: 'ana@clinica.com' }],
    ['an empty sub', { sub: '' }],
    ['a numeric sub', { sub: 42 }],
    ['a null sub', { sub: null }],
    ['an e-mail that is not text', { sub: 'auth0|abc123', email: 7 }],
    ['a null e-mail', { sub: 'auth0|abc123', email: null }],
  ])('rejects %s', (_label, claims) => {
    expect(operatorClaimsSchema.safeParse(claims).success).toBe(false);
  });

  it.each([undefined, null, 'auth0|abc123', 42, []])('rejects %j as claims', (claims) => {
    expect(operatorClaimsSchema.safeParse(claims).success).toBe(false);
  });
});
