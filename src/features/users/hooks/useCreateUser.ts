import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { createUserWithRoles, type CreateUserOutcome } from '../api/createUserWithRoles';
import type { Role } from '../schemas/role';
import type { CreateUserFormValues } from '../schemas/userForm';
import { userKeys } from './userKeys';

export interface CreateUserVariables {
  readonly values: CreateUserFormValues;
  /** The roles chosen, taken from the catalog; the form only holds their ids. */
  readonly roles: readonly Role[];
}

/**
 * Creates a user and gives it its roles. If the user could not be created it fails with the
 * error; if it was created, even when some role failed, it succeeds and the outcome says which
 * ones are pending (FR-023). It is never retried on its own (constitution IV).
 *
 * The variables of a mutation hold the initial password, and TanStack Query keeps them for five
 * minutes by default, so this mutation is collected as soon as nothing watches it (`gcTime: 0`);
 * the screen resets it when it is done (research D13).
 */
export function useCreateUser(): UseMutationResult<CreateUserOutcome, Error, CreateUserVariables> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ values, roles }: CreateUserVariables) =>
      createUserWithRoles(users, values, roles),
    gcTime: 0,
    onSuccess: ({ user, assigned }) => {
      // What the service confirmed, so the detail opens with it. The lists and the searches are
      // marked as stale: the new user belongs in them.
      queryClient.setQueryData(userKeys.detail(user.id), user);
      queryClient.setQueryData(
        userKeys.roles(user.id),
        [...assigned].sort((a, b) => a.name.localeCompare(b.name, 'es')),
      );
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: userKeys.searches() });
    },
  });
}
