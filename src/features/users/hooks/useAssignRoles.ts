import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { assignRoles, type AssignableRole, type AssignRolesResult } from '../api/assignRoles';
import { refreshAfterRoleChange } from './refreshUser';

/**
 * Gives a user the roles that are still pending, such as the ones that failed when it was created
 * (FR-023). A role that fails does not fail the mutation: the result says which ones were assigned
 * and which were not, and the screen tells why. What is left stale is decided by the first refusal,
 * as for one role: the roles of the user (always), the catalog if a role is gone, or the user
 * itself if its status changed.
 */
export function useAssignRoles(
  userId: number,
): UseMutationResult<AssignRolesResult, Error, { readonly roles: readonly AssignableRole[] }> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roles }: { readonly roles: readonly AssignableRole[] }) =>
      assignRoles(users, userId, roles),
    onSettled: (result, error) =>
      refreshAfterRoleChange(queryClient, userId, error ?? result?.failed[0]?.error, 'assignRole'),
  });
}
