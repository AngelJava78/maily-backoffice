import type { ModuleCapabilities } from '@/features/modules';

import { can } from './permissions';

interface PermissionHolder {
  readonly permissions: ReadonlySet<string>;
}

/**
 * What the operator may do in the Módulos section (spec 013, FR-008 to FR-024). Every decision goes
 * through `can()`, which already requires `modules:read` before any other action. Editing, blocking
 * and unblocking share `modules:update`.
 */
export function getModuleCapabilities(access: PermissionHolder): ModuleCapabilities {
  const canUpdate = can(access, { resource: 'modules', action: 'update' });
  return {
    canCreate: can(access, { resource: 'modules', action: 'write' }),
    canEdit: canUpdate,
    canBlock: canUpdate,
    canUnblock: canUpdate,
    canDelete: can(access, { resource: 'modules', action: 'delete' }),
  };
}
