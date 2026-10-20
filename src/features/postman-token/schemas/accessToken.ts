import { z } from 'zod';

/**
 * What is read of the payload of an access token (data-model.md, `AccessTokenClaims`). `exp` is a
 * whole number of seconds since the Unix epoch (RFC 7519); without it the token is unreadable.
 * Every other claim is discarded when the payload is validated: none is kept or logged.
 */
export const accessTokenClaimsSchema = z.object({ exp: z.number().int().positive() });

export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;

/**
 * The token on screen (data-model.md, `IssuedToken`). `value` is a JWT of three parts separated by
 * dots: it is never logged, serialized or taken out of the state of the screen. `expiresAt` is an
 * ISO 8601 UTC text, `new Date(exp * 1000).toISOString()`.
 */
export interface IssuedToken {
  readonly value: string;
  readonly expiresAt: string;
}
