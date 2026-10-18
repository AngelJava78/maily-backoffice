import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { updateUser } from '../api/usersApi';
import type { PlatformUser } from '../schemas/user';
import { toUpdateUserBody, type EditUserFormValues } from '../schemas/userForm';
import { isUserOutOfDate, refreshUser } from './refreshUser';
import { userKeys } from './userKeys';

export interface UpdateUserVariables {
  readonly values: EditUserFormValues;
}

/**
 * Changes the name and the last names of an active user (FR-013). The email is not part of it: it
 * is never sent. Without an optimistic update (constitution IV): what the service confirmed is
 * what the detail shows. It is never retried on its own.
 */
export function useUpdateUser(
  userId: number,
): UseMutationResult<PlatformUser, Error, UpdateUserVariables> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ values }: UpdateUserVariables) =>
      updateUser(users, userId, toUpdateUserBody(values)),
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.detail(userId), user);
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: userKeys.searches() });
    },
    // Returned, so the failure is seen together with the user as it is now (its new status).
    onError: (error) =>
      isUserOutOfDate(error, 'update') ? refreshUser(queryClient, userId) : undefined,
  });
}
