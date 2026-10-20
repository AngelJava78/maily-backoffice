/** The `exp` of the token that `fakeAccessToken()` makes by default: 2030-03-17T17:46:40.000Z. */
export const FAKE_TOKEN_EXP = 1_900_000_000;

/** `{"alg":"RS256","typ":"JWT"}`, the header every real access token starts with. */
const HEADER = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * A text with the shape of an access token (three base64url parts separated by dots) whose payload
 * holds the given claims. For tests only: its signature is not valid and nothing verifies it, which
 * is also true of the real one in the browser (the APIs are the ones that check it).
 */
export function fakeAccessToken(
  claims: { readonly exp: number } & Readonly<Record<string, unknown>> = { exp: FAKE_TOKEN_EXP },
): string {
  return `${HEADER}.${toBase64Url(JSON.stringify(claims))}.${toBase64Url('signature')}`;
}
