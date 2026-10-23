import { z } from 'zod';

const moduleTypeSchema = z.object({
  id: z.union([z.literal(1), z.literal(2)]),
  name: z.string(),
});

export type ModuleType = z.output<typeof moduleTypeSchema>;

/** A module of the catalog (feature 014): a row of the permission matrix. */
export const moduleSchema = z
  .object({
    id: z.number().int().min(1),
    key: z.string().regex(/^[a-z][a-z0-9_]*$/),
    name: z.string().max(100),
    sort_order: z.number().int(),
    type: moduleTypeSchema,
  })
  .transform((dto) => ({
    id: dto.id,
    key: dto.key,
    name: dto.name,
    sortOrder: dto.sort_order,
    type: dto.type,
  }));

export type Module = z.output<typeof moduleSchema>;

export const modulesSchema = z.array(moduleSchema);
