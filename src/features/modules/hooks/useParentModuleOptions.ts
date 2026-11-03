import { eligibleParents } from '../policy/moduleHierarchy';
import { MODULE_STATUS, type ModuleTypeId } from '../schemas/moduleActionCatalog';
import type { ParentModuleRef } from '../schemas/systemModule';
import { useModulesCatalog } from './useModulesCatalog';

/**
 * How long a catalog that is already loaded counts as fresh for the options: opening a form does
 * not ask for it again (013 research D10: no request of its own to open the panel).
 */
const OPTIONS_FRESH_FOR_MS = 30_000;

export interface ParentModuleOptions {
  /** The modules the module being created or edited can have as its parent (FR-010). */
  readonly options: readonly ParentModuleRef[];
  readonly isLoading: boolean;
  /** The Active catalog could not be loaded and there is nothing to offer. */
  readonly isError: boolean;
}

/**
 * The options of the "Módulo padre" field. They come from the Active catalog, which is the same
 * query the screen already uses (same key: no new request while the screen is on "Activos") and is
 * the only request when the form is opened from "Bloqueados" (research D7).
 */
export function useParentModuleOptions({
  typeId,
  excludeModuleId,
}: {
  readonly typeId: ModuleTypeId;
  readonly excludeModuleId: number | null;
}): ParentModuleOptions {
  const query = useModulesCatalog(MODULE_STATUS.ACTIVE, { staleTime: OPTIONS_FRESH_FOR_MS });

  return {
    options:
      query.data === undefined ? [] : eligibleParents(query.data, { typeId, excludeModuleId }),
    isLoading: query.isLoading,
    isError: query.isError && query.data === undefined,
  };
}
