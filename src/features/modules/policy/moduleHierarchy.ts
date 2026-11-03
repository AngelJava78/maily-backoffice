import type { ModuleTypeId } from '../schemas/moduleActionCatalog';
import {
  isProtectedModule,
  type ParentModuleRef,
  type SystemModule,
} from '../schemas/systemModule';

/**
 * The modules a module can have as its parent (FR-010): top level (there is only one level), of
 * its same type, never one of the four base modules and never the module itself. `modules` is the
 * Active catalog (research D7): the Backoffice does not offer a Blocked parent.
 */
export function eligibleParents(
  modules: readonly SystemModule[],
  {
    typeId,
    excludeModuleId,
  }: { readonly typeId: ModuleTypeId; readonly excludeModuleId: number | null },
): ParentModuleRef[] {
  return modules
    .filter(
      (module) =>
        module.parentModule === null &&
        module.typeId === typeId &&
        !isProtectedModule(module.key) &&
        module.id !== excludeModuleId,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'))
    .map(({ id, key, name }) => ({ id, key, name }));
}

/** How many modules of the loaded list have `moduleId` as their parent: its submodules "a la vista". */
export function submoduleCountOf(modules: readonly SystemModule[], moduleId: number): number {
  return modules.filter((module) => module.parentModule?.id === moduleId).length;
}
