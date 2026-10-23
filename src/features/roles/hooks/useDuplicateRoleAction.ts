import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

import { describeRoleError } from '../api/roleErrors';
import type { Role } from '../schemas/role';
import { useDuplicateRole } from './useDuplicateRole';

export interface DuplicateRoleActionApi {
  readonly pending: boolean;
  readonly duplicate: () => void;
}

/**
 * "Duplicar" (Historia 4): no confirmation, so `duplicate()` runs right away. A partial copy of
 * permissions (FR-019) still counts as success — `onDuplicated` fires with the new role either
 * way, same as `useCreateRole`'s own callers do.
 */
export function useDuplicateRoleAction(
  roleId: number,
  onDuplicated: (role: Role) => void,
): DuplicateRoleActionApi {
  const duplicateRole = useDuplicateRole();
  const notify = useNotify();

  return {
    pending: duplicateRole.isPending,
    duplicate: () => {
      duplicateRole.mutate(roleId, {
        onSuccess: (result) => {
          if (result.failedPermissionIds.length > 0) {
            notify({
              severity: 'warning',
              message: messages.roles.errors.saveIncomplete(result.failedPermissionIds.length),
            });
          }
          onDuplicated(result.role);
        },
        onError: (error) => {
          notify({ severity: 'error', message: describeRoleError(error).message });
        },
      });
    },
  };
}
