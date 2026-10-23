import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { nextDuplicateName } from '../schemas/role';
import { useCreateRole, type CreateRoleResult } from './useCreateRole';
import { useRolesCatalog } from './useRolesCatalog';

/**
 * "Duplicar" (Historia 4, FR-014): creates a role of the same type and with the same permissions
 * as `roleId`, under a name derived from the original's (`nextDuplicateName`) instead of asking for
 * one. It is `useCreateRole` underneath (research D7), not a second copy of its orchestration: the
 * duplicate's permissions are independent associations from the start (research D8), so changing
 * them afterwards never touches the original.
 */
export function useDuplicateRole(): UseMutationResult<CreateRoleResult, Error, number> {
  const create = useCreateRole();
  const rolesQuery = useRolesCatalog();

  return useMutation({
    mutationFn: (originalId: number): Promise<CreateRoleResult> => {
      const roles = rolesQuery.data ?? [];
      const original = roles.find((role) => role.id === originalId);
      if (original === undefined) {
        return Promise.reject(new Error('The role being duplicated is no longer available.'));
      }
      const existingNames = new Set(roles.map((role) => role.name.toLowerCase()));
      return create.mutateAsync({
        name: nextDuplicateName(original.name, existingNames),
        description: original.description,
        typeId: original.type.id,
        copyPermissionsFromRoleId: original.id,
      });
    },
  });
}
