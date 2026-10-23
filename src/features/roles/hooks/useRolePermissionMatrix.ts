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
 */
export function useRolePermissionMatrix(
  typeId: 1 | 2,
  grantedPermissionIds: ReadonlySet<number> | undefined,
): UseRolePermissionMatrixResult {
  const modulesQuery = useModulesCatalog(typeId);
  const permissionsQuery = usePermissionsCatalog();
  const noop = (): void => undefined;

  if (grantedPermissionIds === undefined) {
    return { matrix: undefined, isLoading: false, isError: false, error: null, refetch: noop };
  }
  if (modulesQuery.isLoading || permissionsQuery.isLoading) {
    return { matrix: undefined, isLoading: true, isError: false, error: null, refetch: noop };
  }
  if (modulesQuery.isError || permissionsQuery.isError) {
    return {
      matrix: undefined,
      isLoading: false,
      isError: true,
      error: modulesQuery.error ?? permissionsQuery.error,
      refetch: () => {
        void modulesQuery.refetch();
        void permissionsQuery.refetch();
      },
    };
  }
  return {
    matrix: buildPermissionMatrix(
      modulesQuery.data ?? [],
      permissionsQuery.data ?? [],
      grantedPermissionIds,
      typeId,
    ),
    isLoading: false,
    isError: false,
    error: null,
    refetch: noop,
  };
}
