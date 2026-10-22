import { z } from 'zod';

import { platformUserSchema } from '@/features/users';

/** `resource:action` in lower case; the users service enforces the same pattern. */
const permissionNameSchema = z.string().regex(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/);

/**
 * The type of a role, from the catalog of the platform (feature 006, FR-002): 1 Sistema gives
 * access to the Backoffice, 2 Clínica to the clinic-facing app. Only `id` is ever compared
 * (`features/auth/policy/roleTypes.ts`); `name` is informational and may be renamed or translated.
 */
const roleTypeSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
});

/** An active role of the person with its type and its active permissions, as `me` returns it. */
export const accessRoleSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
  type: roleTypeSchema,
  permissions: z.array(permissionNameSchema),
});

/**
 * Answer of `GET /api/v1/authorization/me` (contracts/users-service-me.md, feature 006): the
 * person (or `null` when the token is valid but nobody is registered with it) and their active
 * roles. `password_change_required` also travels in the response but is not modeled here: Zod
 * drops fields it does not declare, which is exactly what FR-010 of feature 006 needs (its
 * presence never changes what is parsed).
 */
export const myAccessSchema = z.object({
  user: platformUserSchema.nullable(),
  roles: z.array(accessRoleSchema),
});

export type AccessRole = z.output<typeof accessRoleSchema>;
export type MyAccess = z.output<typeof myAccessSchema>;
