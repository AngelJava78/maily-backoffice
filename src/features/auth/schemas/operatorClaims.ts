import { z } from 'zod';

/**
 * Claims of the Auth0 token that the application reads (constitution II). Only the account id and
 * the e-mail live in Auth0: the `sub` keys the access cache, and the e-mail is shown on the
 * "access denied" and "check failed" screens. Everything else comes from the platform user.
 */
export const operatorClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().optional(),
});

export type OperatorClaims = z.output<typeof operatorClaimsSchema>;
