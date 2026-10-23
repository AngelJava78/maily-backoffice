import { MODULE_ACTION_ORDER, type ModuleActionKey } from './moduleActionCatalog';
import type { SystemModule, SystemModuleBase } from './systemModule';

/** The part of a permission this cross-reference needs (contracts/modules-service.md). */
export interface ModulePermissionRef {
  readonly id: number;
  readonly module: { readonly key: string } | null;
  readonly action: { readonly key: string } | null;
}

/**
 * Cross-references modules with the permissions catalog (research D3): neither side of the API
 * gives the other. Each module gains the actions it has, always in the fixed order (Ver, Crear,
 * Modificar, Eliminar), whatever order the permissions arrived in.
 */
export function attachModuleActions(
  modules: readonly SystemModuleBase[],
  permissions: readonly ModulePermissionRef[],
): SystemModule[] {
  return modules.map((module) => {
    const actions = new Set<ModuleActionKey>();
    const permissionIdByAction = new Map<ModuleActionKey, number>();
    for (const actionKey of MODULE_ACTION_ORDER) {
      const match = permissions.find(
        (permission) =>
          permission.module?.key === module.key && permission.action?.key === actionKey,
      );
      if (match !== undefined) {
        actions.add(actionKey);
        permissionIdByAction.set(actionKey, match.id);
      }
    }
    return { ...module, actions, permissionIdByAction };
  });
}
