import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { HttpClient } from '@/shared/api/httpClient';
import { useHttpClients } from '@/shared/api/httpClientsContext';
import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { blockUser, deleteUser, reactivateUser, unblockUser } from '../api/usersApi';
import type { PlatformUser } from '../schemas/user';
import { isUserOutOfDate, refreshUser } from './refreshUser';
import { userKeys } from './userKeys';

/** The changes of status of a user. */
export type StatusAction = 'block' | 'unblock' | 'delete' | 'reactivate';

export interface ChangeUserStatusVariables {
  readonly action: StatusAction;
}

/** The user as the service returns it, or nothing when the service answers without a body. */
type StatusOperation = (client: HttpClient, userId: string) => Promise<PlatformUser | undefined>;

// The action is a union written by the code, never text from outside, so a plain object is safe.
const OPERATIONS = {
  block: blockUser,
  unblock: unblockUser,
  // The service answers a deletion with a 204: the user is asked for again to know its new status.
  delete: async (client, userId) => {
    await deleteUser(client, userId);
    return undefined;
  },
  reactivate: reactivateUser,
} satisfies Record<StatusAction, StatusOperation>;

/** The actions after which the user is not active, so its roles cannot be asked for any more. */
const LEAVE_ACTIVE: ReadonlySet<StatusAction> = new Set(['block', 'delete']);

/**
 * Changes the status of a user: blocks, unblocks, deletes or reactivates it. Without an optimistic
 * update (constitution IV): the screen shows the status that the service confirmed, and a user
 * whose access account could not be updated keeps the one it had. It is never retried on its own.
 *
 * What is cached changes with the status (data-model.md): the user is the one the service returned,
 * or is asked for again if it did not return it; the roles of a user that stops being active are
 * forgotten, because they cannot be asked for, and those of one that is active again are marked as
 * stale; the lists and the searches are stale. A refusal that says the user is not as the screen
 * believes asks for the user again.
 */
export function useChangeUserStatus(
  userId: string,
): UseMutationResult<PlatformUser | undefined, Error, ChangeUserStatusVariables> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action }: ChangeUserStatusVariables) => OPERATIONS[action](users, userId),
    onSuccess: async (user, { action }) => {
      if (user === undefined) {
        // Waited for, so the dialog that asked for the change closes with the new status on screen.
        await atMost(
          REFRESH_WAIT_MS,
          queryClient.invalidateQueries({ queryKey: userKeys.detail(userId), exact: true }),
        );
      } else {
        queryClient.setQueryData(userKeys.detail(userId), user);
      }
      // After the user: its roles are only forgotten once the screen knows it is not active.
      if (LEAVE_ACTIVE.has(action)) {
        queryClient.removeQueries({ queryKey: userKeys.roles(userId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: userKeys.roles(userId) });
      }
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: userKeys.searches() });
    },
    // Returned, so the failure is seen together with the user as it is now (its other status).
    onError: (error, { action }) =>
      isUserOutOfDate(error, action) ? refreshUser(queryClient, userId) : undefined,
  });
}
