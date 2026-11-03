import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { HttpClient } from '@/shared/api/httpClient';
import { useHttpClients } from '@/shared/api/httpClientsContext';
import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { blockRole, unblockRole } from '../api/rolesApi';
import type { Role } from '../schemas/role';
import { roleKeys } from './roleKeys';

export type RoleStatusAction = 'block' | 'unblock';

export interface ChangeRoleStatusVariables {
  readonly roleId: number;
  readonly action: RoleStatusAction;
}

type StatusOperation = (client: HttpClient, roleId: number) => Promise<Role>;

// The action is a union written by the code, never text from outside, so a plain object is safe.
const OPERATIONS = { block: blockRole, unblock: unblockRole } satisfies Record<
  RoleStatusAction,
  StatusOperation
>;

/**
 * Blocks or unblocks a role (feature 025, research D6), without an optimistic update (constitution
 * IV). Whatever the outcome — also a 409 because someone else changed the status a moment earlier —
 * both lists are asked for again, and the caller hears back once they are (or after
 * `REFRESH_WAIT_MS` at most), so the role is already in the list of its new status (SC-005).
 */
export function useChangeRoleStatus(): UseMutationResult<Role, Error, ChangeRoleStatusVariables> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, action }: ChangeRoleStatusVariables) =>
      OPERATIONS[action](users, roleId),
    onSettled: () => {
      return atMost(REFRESH_WAIT_MS, queryClient.invalidateQueries({ queryKey: roleKeys.lists() }));
    },
  });
}
