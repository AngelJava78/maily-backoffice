import { describe, expect, it } from 'vitest';

import { FAKE_TOKEN_EXP, fakeAccessToken } from './accessToken';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Decodes a base64url part the way a browser does (UTF-8 aware, with `atob`, without `Buffer`). */
function decodePart(part: string | undefined): unknown {
  const base64 = (part ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  return parsed;
}

describe('fakeAccessToken', () => {
  it('has the shape of a JWT: three non-empty base64url parts separated by dots', () => {
    const parts = fakeAccessToken().split('.');

    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part).toMatch(BASE64URL);
    }
  });

  it('starts with the usual header of an RS256 token', () => {
    const [header] = fakeAccessToken().split('.');

    expect(header).toBe('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(decodePart(header)).toEqual({ alg: 'RS256', typ: 'JWT' });
  });

  it('carries the claims it is given in the payload, including text that is not ASCII', () => {
    const token = fakeAccessToken({ exp: 1_900_000_000, sub: 'auth0|ana', name: 'Ñandú' });
    const [, payload] = token.split('.');

    expect(decodePart(payload)).toEqual({ exp: 1_900_000_000, sub: 'auth0|ana', name: 'Ñandú' });
  });

  it('expires on 2030-03-17T17:46:40.000Z when no claims are given', () => {
    const [, payload] = fakeAccessToken().split('.');

    expect(FAKE_TOKEN_EXP).toBe(1_900_000_000);
    expect(new Date(FAKE_TOKEN_EXP * 1000).toISOString()).toBe('2030-03-17T17:46:40.000Z');
    expect(decodePart(payload)).toEqual({ exp: FAKE_TOKEN_EXP });
  });

  it('gives different tokens for different expirations', () => {
    expect(fakeAccessToken({ exp: 1_900_000_000 })).not.toBe(
      fakeAccessToken({ exp: 1_900_000_001 }),
    );
  });

  it('ends with a fixed text that is not a valid signature', () => {
    const [, , first] = fakeAccessToken({ exp: 1_900_000_000 }).split('.');
    const [, , second] = fakeAccessToken({ exp: 1_900_000_500 }).split('.');

    expect(first).toBe(second);
    expect(first).toBe('c2lnbmF0dXJl');
  });
});
