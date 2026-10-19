import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import type { AssignableRole } from '../api/assignRoles';
import { unassignRole } from '../api/userRolesApi';
import { refreshAfterRoleChange } from './refreshUser';

export interface RemoveUserRoleVariables {
  /** The role to take away; its name is for the messages of the screen that asked for it. */
  readonly role: AssignableRole;
}

/**
 * Takes one role away from an active user (FR-016). A role that the user did not have any more is a
 * failure the screen tells apart; either way the roles are asked for again. It is never retried on
 * its own.
 */
export function useRemoveUserRole(
  userId: string,
): UseMutationResult<void, Error, RemoveUserRoleVariables> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ role }: RemoveUserRoleVariables) => unassignRole(users, userId, role.id),
    // Returned: the mutation ends when the roles on screen are the real ones.
    onSettled: (_result, error) =>
      refreshAfterRoleChange(queryClient, userId, error, 'unassignRole'),
  });
}
