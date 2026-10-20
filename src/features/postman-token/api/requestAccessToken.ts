import { z } from 'zod';

import type { IssuedToken } from '../schemas/accessToken';
import { decodeAccessToken } from './decodeAccessToken';
import { classifyTokenError, TokenRequestError } from './tokenFailure';

/**
 * `getAccessTokenSilently` of the Auth0 SDK, seen from the boundary. It promises text, but what it
 * answers is validated like any other outside data (constitution II).
 */
export type GetAccessToken = (options: { readonly cacheMode: 'off' }) => Promise<unknown>;

const accessTokenTextSchema = z.string().min(1);

/**
 * Asks Auth0, once, for a new access token (contracts/auth0-token-request.md). `cacheMode: 'off'`
 * makes the SDK exchange the refresh token for a new one instead of handing back the one it has,
 * which is what "Generar" and "Refrescar" mean (research D5). It returns the token with its
 * expiration, or fails with a `TokenRequestError` whose `kind` says why.
 */
export async function requestAccessToken(getAccessToken: GetAccessToken): Promise<IssuedToken> {
  let answer: unknown;
  try {
    answer = await getAccessToken({ cacheMode: 'off' });
  } catch (error) {
    throw new TokenRequestError(classifyTokenError(error), { cause: error });
  }
  const text = accessTokenTextSchema.safeParse(answer);
  if (!text.success) {
    throw new TokenRequestError('unreadable-token');
  }
  return decodeAccessToken(text.data);
}
