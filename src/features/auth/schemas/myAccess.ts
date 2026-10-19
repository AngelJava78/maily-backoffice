import { z } from 'zod';

import { platformUserSchema } from '@/features/users';

/** `resource:action` in lower case; the users service enforces the same pattern. */
const permissionNameSchema = z.string().regex(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/);

/** An active role of the person with its active permissions, as the `me` operation returns it. */
export const accessRoleSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
  permissions: z.array(permissionNameSchema),
});

/**
 * Answer of `GET /api/v1/authorization/me` (contracts/users-service.md, M1): the person (or `null`
 * when the token is valid but nobody is registered with it) and the roles that count for access.
 */
export const myAccessSchema = z.object({
  user: platformUserSchema.nullable(),
  roles: z.array(accessRoleSchema),
});

export type AccessRole = z.output<typeof accessRoleSchema>;
export type MyAccess = z.output<typeof myAccessSchema>;
