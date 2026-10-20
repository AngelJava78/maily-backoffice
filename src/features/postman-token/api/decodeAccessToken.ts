import { accessTokenClaimsSchema, type IssuedToken } from '../schemas/accessToken';
import { TokenRequestError } from './tokenFailure';

/** base64url to text, UTF-8 aware. It throws if the part is not base64url. */
function decodeBase64Url(part: string): string {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Reads the expiration of an access token (research D6): splits the three parts, decodes the
 * payload and validates it. The signature is not checked, because the APIs do that and it is not
 * a decision of the frontend. A text that is not a token with a readable `exp` fails closed with an
 * `unreadable-token` error, so a token is never shown without its expiration.
 */
export function decodeAccessToken(token: string): IssuedToken {
  try {
    const parts = token.split('.');
    const payload = parts[1];
    if (parts.length !== 3 || payload === undefined || parts.some((part) => part === '')) {
      throw new Error('A token has three parts separated by dots');
    }
    const claims: unknown = JSON.parse(decodeBase64Url(payload));
    const { exp } = accessTokenClaimsSchema.parse(claims);
    return { value: token, expiresAt: new Date(exp * 1000).toISOString() };
  } catch (cause) {
    throw new TokenRequestError('unreadable-token', { cause });
  }
}
