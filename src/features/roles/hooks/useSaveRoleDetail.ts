import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';
import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { associateRolePermission, disassociateRolePermission } from '../api/rolePermissionsApi';
import { describeRolePermissionAssociationError } from '../api/roleErrors';
import { updateRole } from '../api/rolesApi';
import { roleKeys } from './roleKeys';

export interface SaveRoleDetailVariables {
  readonly roleId: number;
  /** Only the fields that changed; `{}` saves permissions alone (FR-010, FR-021). */
  readonly nameChanges: { readonly name?: string; readonly description?: string | null };
  readonly toAssociate: readonly number[];
  readonly toDisassociate: readonly number[];
}

export interface SaveRoleDetailResult {
  /** Permission ids whose associate/disassociate call failed for real (research D6, FR-018):
   * empty means everything that was asked for is now as it should be. */
  readonly failedPermissionIds: readonly number[];
}

function rejectedIds(
  ids: readonly number[],
  outcomes: readonly PromiseSettledResult<void>[],
): number[] {
  return ids.filter((_id, index) => {
    const outcome = outcomes[index];
    return (
      outcome?.status === 'rejected' &&
      describeRolePermissionAssociationError(outcome.reason).kind !== 'alreadyDesired'
    );
  });
}

/**
 * Saves the pending changes of a role's detail in one action (research D6): the name/description
 * first (cheap, a single call, fails fast before touching permissions), then the permission diff
 * — only the associations/disassociations actually needed — in parallel. A permission call that
 * fails does not reject the whole save: it comes back in `failedPermissionIds`, and the caller can
 * retry just those. A 409 that means the desired state was already the real one (research D6) is
 * not a failure to report.
 */
export function useSaveRoleDetail(): UseMutationResult<
  SaveRoleDetailResult,
  Error,
  SaveRoleDetailVariables
> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      nameChanges,
      toAssociate,
      toDisassociate,
    }: SaveRoleDetailVariables): Promise<SaveRoleDetailResult> => {
      if (Object.keys(nameChanges).length > 0) {
        await updateRole(users, roleId, nameChanges);
      }

      const [associations, disassociations] = await Promise.all([
        Promise.allSettled(
          toAssociate.map((permissionId) => associateRolePermission(users, roleId, permissionId)),
        ),
        Promise.allSettled(
          toDisassociate.map((permissionId) =>
            disassociateRolePermission(users, roleId, permissionId),
          ),
        ),
      ]);

      return {
        failedPermissionIds: [
          ...rejectedIds(toAssociate, associations),
          ...rejectedIds(toDisassociate, disassociations),
        ],
      };
    },
    // Runs whether the save succeeded, partially failed, or the name update rejected outright:
    // in every case the screen must show what the server actually has now, not what was attempted.
    onSettled: (_data, _error, variables) => {
      return atMost(
        REFRESH_WAIT_MS,
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: roleKeys.permissions(variables.roleId),
            exact: true,
          }),
          queryClient.invalidateQueries({ queryKey: roleKeys.lists(), exact: true }),
        ]),
      );
    },
  });
}
