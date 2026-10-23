import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import type { ModulesTypeFilter } from '../schemas/modulesLocation';

/** Tipo and Buscar are applied in the client, over the catalog already loaded (research D6). */
export function filterModules(
  modules: readonly SystemModule[],
  { type, search }: { readonly type: ModulesTypeFilter; readonly search: string },
): SystemModule[] {
  const byType = modules.filter((module) => {
    if (type === 'all') {
      return true;
    }
    return type === 'system'
      ? module.typeId === MODULE_TYPE.SYSTEM
      : module.typeId === MODULE_TYPE.CLINIC;
  });
  const needle = search.trim().toLowerCase();
  if (needle === '') {
    return byType;
  }
  return byType.filter(
    (module) =>
      module.name.toLowerCase().includes(needle) || module.key.toLowerCase().includes(needle),
  );
}
