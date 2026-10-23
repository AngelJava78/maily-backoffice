import { z } from 'zod';

const statusSchema = z.object({ id: z.number().int(), name: z.string() });

const roleTypeSchema = z.object({
  id: z.union([z.literal(1), z.literal(2)]),
  name: z.string(),
});

export type RoleType = z.output<typeof roleTypeSchema>;

/** A role, with its type (feature 014): the permission matrix it can have depends on it. */
export const roleSchema = z
  .object({
    id: z.number().int().min(1),
    name: z.string().min(1).max(50),
    description: z.string().max(500).nullable(),
    created_at: z.iso.datetime({ offset: true }),
    status: statusSchema,
    type: roleTypeSchema,
  })
  .transform((dto) => ({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    createdAt: dto.created_at,
    status: dto.status,
    type: dto.type,
  }));

export type Role = z.output<typeof roleSchema>;

export const rolesSchema = z.array(roleSchema);

/** What the alta/edición form needs, validated at the boundary (Principio II). */
export const roleCreateInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
  description: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  typeId: z.union([z.literal(1), z.literal(2)]),
});

export type RoleCreateInput = z.output<typeof roleCreateInputSchema>;
