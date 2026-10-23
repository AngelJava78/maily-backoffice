import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';
import { atMost, REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { deleteRole } from '../api/rolesApi';
import { roleKeys } from './roleKeys';

/**
 * Deletes a role (FR-015): allowed even if it is assigned to people or clinics (edge case of
 * spec.md, confirmed against `role_service.py`'s soft delete). Clearing the selection when the
 * deleted role was the open one is the caller's job (T083), not this hook's.
 */
export function useDeleteRole(): UseMutationResult<void, Error, number> {
  const { users } = useHttpClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: number) => deleteRole(users, roleId),
    onSettled: () => {
      return atMost(
        REFRESH_WAIT_MS,
        queryClient.invalidateQueries({ queryKey: roleKeys.lists(), exact: true }),
      );
    },
  });
}
