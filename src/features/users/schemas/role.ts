import { z } from 'zod';

const statusSchema = z.object({ id: z.number().int(), name: z.string() });

/**
 * A role of the catalog of the platform (operations R1 and U10). It is not the `AccessRole` of the
 * feature 001, which carries the permissions and comes from the access of the operator.
 */
export const roleSchema = z
  .object({
    id: z.number().int().min(1),
    name: z.string().min(1).max(50),
    description: z.string().max(500).nullable(),
    created_at: z.iso.datetime({ offset: true }),
    status: statusSchema,
  })
  .transform((dto) => ({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    createdAt: dto.created_at,
    status: dto.status,
  }));

export type Role = z.output<typeof roleSchema>;

export const rolesSchema = z.array(roleSchema);

/** The answer of assigning a role to a user (operation U11). */
export const userRoleAssignmentSchema = z
  .object({
    user_id: z.number().int().min(1),
    role: z.object({ id: z.number().int().min(1), name: z.string() }),
  })
  .transform((dto) => ({ userId: dto.user_id, role: dto.role }));

export type UserRoleAssignment = z.output<typeof userRoleAssignmentSchema>;
