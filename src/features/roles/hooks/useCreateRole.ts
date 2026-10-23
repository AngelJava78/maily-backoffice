import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';
import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { realAssociationFailureIds } from '../api/roleErrors';
import { associateRolePermission, listRolePermissions } from '../api/rolePermissionsApi';
import { createRole } from '../api/rolesApi';
import type { Role } from '../schemas/role';
import { roleKeys } from './roleKeys';

export interface CreateRoleVariables {
  readonly name: string;
  readonly description: string | null;
  readonly typeId: 1 | 2;
  /** Optional (FR-012): a role of the same type whose permissions start the new one's table. */
  readonly copyPermissionsFromRoleId?: number;
}

export interface CreateRoleResult {
  readonly role: Role;
  /** Permission ids that failed to copy (research D7, FR-019): empty means every one that was
   * asked for copied over; the role itself is created either way, never rolled back. */
  readonly failedPermissionIds: readonly number[];
}

/**
 * Creates a role (FR-011) and, if asked to copy another role's permissions (FR-012), associates
 * each one right after (research D7): the same two-step shape as `useSaveRoleDetail` (create/update
 * first, fails fast and cheap; the permission calls after, in parallel, with their own partial
 * failures never rolled back into "the role doesn't exist"). `useDuplicateRole` reuses this hook
 * instead of repeating the orchestration.
 */
export function useCreateRole(): UseMutationResult<CreateRoleResult, Error, CreateRoleVariables> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: CreateRoleVariables): Promise<CreateRoleResult> => {
      const role = await createRole(users, {
        name: variables.name,
        description: variables.description,
        typeId: variables.typeId,
      });
      if (variables.copyPermissionsFromRoleId === undefined) {
        return { role, failedPermissionIds: [] };
      }

      const sourcePermissions = await listRolePermissions(
        users,
        variables.copyPermissionsFromRoleId,
      );
      const permissionIds = sourcePermissions.map((permission) => permission.id);
      const outcomes = await Promise.allSettled(
        permissionIds.map((permissionId) => associateRolePermission(users, role.id, permissionId)),
      );

      return { role, failedPermissionIds: realAssociationFailureIds(permissionIds, outcomes) };
    },
    onSettled: () => {
      return atMost(
        REFRESH_WAIT_MS,
        queryClient.invalidateQueries({ queryKey: roleKeys.lists(), exact: true }),
      );
    },
  });
}
