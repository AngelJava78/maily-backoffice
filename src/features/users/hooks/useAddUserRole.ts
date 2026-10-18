import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import type { AssignableRole } from '../api/assignRoles';
import { assignRole } from '../api/userRolesApi';
import type { UserRoleAssignment } from '../schemas/role';
import { refreshAfterRoleChange } from './refreshUser';

export interface AddUserRoleVariables {
  /** The role to give; its name is for the messages of the screen that asked for it. */
  readonly role: AssignableRole;
}

/**
 * Gives one more role to an active user (FR-015). A role that the user already has, or one that is
 * gone, is a failure the screen tells apart; either way the roles are asked for again. It is never
 * retried on its own.
 */
export function useAddUserRole(
  userId: number,
): UseMutationResult<UserRoleAssignment, Error, AddUserRoleVariables> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ role }: AddUserRoleVariables) => assignRole(users, userId, role.id),
    // Returned: the mutation ends when the roles on screen are the real ones.
    onSettled: (_assignment, error) =>
      refreshAfterRoleChange(queryClient, userId, error, 'assignRole'),
  });
}
