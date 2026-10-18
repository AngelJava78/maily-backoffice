import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { assignRoles, type AssignableRole, type AssignRolesResult } from '../api/assignRoles';
import { userKeys } from './userKeys';

/**
 * Gives a user the roles that are still pending, such as the ones that failed when it was created
 * (FR-023). A role that fails does not fail the mutation: the result says which ones were assigned
 * and which were not. The roles of the user are marked as stale either way.
 */
export function useAssignRoles(
  userId: number,
): UseMutationResult<AssignRolesResult, Error, { readonly roles: readonly AssignableRole[] }> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roles }: { readonly roles: readonly AssignableRole[] }) =>
      assignRoles(users, userId, roles),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.roles(userId) });
    },
  });
}
