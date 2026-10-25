import type { HealthCapabilities } from '@/features/health';

import { can } from './permissions';

interface PermissionHolder {
  readonly permissions: ReadonlySet<string>;
}

/**
 * What the operator may do in the registry of «Salud de servicios» (spec 016, FR-034 to FR-040).
 * Every decision goes through `can()`, which already requires `health:read` before any other
 * action: registering needs `health:write`, editing `health:update` and deleting `health:delete`.
 */
export function getHealthCapabilities(access: PermissionHolder): HealthCapabilities {
  return {
    canCreate: can(access, { resource: 'health', action: 'write' }),
    canEdit: can(access, { resource: 'health', action: 'update' }),
    canDelete: can(access, { resource: 'health', action: 'delete' }),
  };
}
