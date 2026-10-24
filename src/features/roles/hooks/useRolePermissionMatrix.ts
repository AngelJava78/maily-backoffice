import { buildPermissionMatrix, type PermissionMatrix } from '../schemas/permissionMatrix';
import { useModulesCatalog } from './useModulesCatalog';
import { usePermissionsCatalog } from './usePermissionsCatalog';

export interface UseRolePermissionMatrixResult {
  readonly matrix: PermissionMatrix | undefined;
  readonly isLoading: boolean;
  /** FR-020: independent of whether the role itself loaded; only the table is affected. */
  readonly isError: boolean;
  readonly error: unknown;
  readonly refetch: () => void;
}

/**
 * The permission matrix of `typeId`, with `grantedPermissionIds` marked (research D3). Starts
 * loading the modules/permissions catalogs as soon as `typeId` (the active tab) is known, without
 * waiting for a specific role to be selected; `grantedPermissionIds` being `undefined` (no role
 * selected yet, or its own detail still loading) simply gives no matrix yet, not an error.
 *
 * A Clínica role (`typeId = 2`) also receives the Sistema modules (spec
 * `015-clinic-roles-system-modules`, FR-001): both catalogs are requested on every call, regardless
 * of `typeId` — `RoleDetailPanel` is not remounted when the selected role changes type, so the
 * number of Hooks called here cannot depend on it (Rules of Hooks; research R2). A Sistema role
 * (`typeId = 1`) only ever uses the Sistema result, unchanged.
 */
export function useRolePermissionMatrix(
  typeId: 1 | 2,
  grantedPermissionIds: ReadonlySet<number> | undefined,
): UseRolePermissionMatrixResult {
  const systemModulesQuery = useModulesCatalog(1);
  const clinicModulesQuery = useModulesCatalog(2);
  const permissionsQuery = usePermissionsCatalog();
  const noop = (): void => undefined;

  const relevantModulesQueries =
    typeId === 2 ? [clinicModulesQuery, systemModulesQuery] : [systemModulesQuery];

  if (grantedPermissionIds === undefined) {
    return { matrix: undefined, isLoading: false, isError: false, error: null, refetch: noop };
  }
  if (relevantModulesQueries.some((query) => query.isLoading) || permissionsQuery.isLoading) {
    return { matrix: undefined, isLoading: true, isError: false, error: null, refetch: noop };
  }
  const failedModulesQuery = relevantModulesQueries.find((query) => query.isError);
  if (failedModulesQuery !== undefined || permissionsQuery.isError) {
    return {
      matrix: undefined,
      isLoading: false,
      isError: true,
      error: failedModulesQuery?.error ?? permissionsQuery.error,
      refetch: () => {
        relevantModulesQueries.forEach((query) => {
          void query.refetch();
        });
        void permissionsQuery.refetch();
      },
    };
  }

  const ownMatrix = buildPermissionMatrix(
    (typeId === 2 ? clinicModulesQuery : systemModulesQuery).data ?? [],
    permissionsQuery.data ?? [],
    grantedPermissionIds,
    typeId,
  );
  const matrix =
    typeId === 1
      ? ownMatrix
      : [
          ...ownMatrix,
          ...buildPermissionMatrix(
            systemModulesQuery.data ?? [],
            permissionsQuery.data ?? [],
            grantedPermissionIds,
            1,
          ),
        ];
  return { matrix, isLoading: false, isError: false, error: null, refetch: noop };
}
