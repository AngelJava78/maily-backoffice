import { z } from 'zod';

import type { ModuleActionKey } from './moduleActionCatalog';

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/** A module as `GET /api/v1/modules` gives it, converted from its DTO (constitution II). */
export const systemModuleSchema = z
  .object({
    id: z.number().int().positive(),
    key: z.string().regex(KEY_PATTERN).max(50),
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable(),
    sort_order: z.number().int(),
    created_at: z.string(),
    status: z.object({ id: z.number().int(), name: z.string() }),
    type: z.object({ id: z.number().int(), name: z.string() }),
    active_permissions_count: z.number().int().nonnegative(),
  })
  .transform((dto) => ({
    id: dto.id,
    key: dto.key,
    name: dto.name,
    description: dto.description,
    sortOrder: dto.sort_order,
    createdAt: dto.created_at,
    statusId: dto.status.id,
    typeId: dto.type.id,
    activePermissionsCount: dto.active_permissions_count,
  }));

export type SystemModuleBase = z.infer<typeof systemModuleSchema>;

/** A module with the actions it has, cross-referenced from the permissions catalog (research D3). */
export interface SystemModule extends SystemModuleBase {
  readonly actions: ReadonlySet<ModuleActionKey>;
  /** The id of the permission behind each marked action, to delete it when the action is unchecked. */
  readonly permissionIdByAction: ReadonlyMap<ModuleActionKey, number>;
}

/** The four modules the platform never lets block or delete (FR-003, FR-021, FR-024). */
export const PROTECTED_MODULE_KEYS: readonly string[] = ['users', 'roles', 'permissions', 'modules'];

export function isProtectedModule(key: string): boolean {
  return PROTECTED_MODULE_KEYS.includes(key);
}
