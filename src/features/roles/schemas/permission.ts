import { z } from 'zod';

/**
 * `key` is not restricted to the four known actions: the `actions` catalog is hand-managed in the
 * backend (research D3) and could grow a fifth one without this schema needing to change.
 * `permissionMatrix.ts` is the layer that only paints a column for the four it knows.
 */
const actionSchema = z.object({
  id: z.number().int().min(1),
  key: z.string(),
  name: z.string(),
});

export type Action = z.output<typeof actionSchema>;

/**
 * A module as a permission embeds it (`ModuleReference`, not `ModuleRead`): no `sort_order`,
 * `description`, `status` or `active_permissions_count` — those only matter for the module itself
 * (data-model.md), and the row order of the matrix always comes from the modules catalog, never
 * from this embedded copy.
 */
const permissionModuleSchema = z.object({
  id: z.number().int().min(1),
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  name: z.string(),
  type: z.object({ id: z.union([z.literal(1), z.literal(2)]), name: z.string() }),
});

/** A permission of the catalog (feature 014): `module`/`action` are `null` when `name` (the
 * `recurso:accion` pair) does not resolve to an Active module or a known action. */
export const permissionSchema = z
  .object({
    id: z.number().int().min(1),
    name: z.string(),
    module: permissionModuleSchema.nullable(),
    action: actionSchema.nullable(),
  })
  .transform((dto) => ({
    id: dto.id,
    name: dto.name,
    module: dto.module,
    action: dto.action,
  }));

export type Permission = z.output<typeof permissionSchema>;

export const permissionsSchema = z.array(permissionSchema);
