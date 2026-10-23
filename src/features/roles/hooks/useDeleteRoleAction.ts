import { useState } from 'react';

import { useNotify } from '@/shared/ui/Notifications';

import { describeRoleError } from '../api/roleErrors';
import { useDeleteRole } from './useDeleteRole';

export interface DeleteRoleActionApi {
  readonly open: boolean;
  readonly pending: boolean;
  readonly start: () => void;
  readonly confirm: () => void;
  readonly cancel: () => void;
}

/**
 * The confirmation dialog of "Eliminar role" (Historia 3, FR-015), as a self-contained action:
 * opens, deletes, and either calls `onDeleted` (closing is always immediate either way) or tells
 * the error through a notification — kept out of `RoleDetailPanel` so adding "Duplicar" next to it
 * (Historia 4) does not keep growing that component's own state.
 */
export function useDeleteRoleAction(roleId: number, onDeleted: () => void): DeleteRoleActionApi {
  const deleteRole = useDeleteRole();
  const notify = useNotify();
  const [open, setOpen] = useState(false);

  return {
    open,
    pending: deleteRole.isPending,
    start: () => {
      setOpen(true);
    },
    confirm: () => {
      deleteRole.mutate(roleId, {
        onSuccess: () => {
          setOpen(false);
          onDeleted();
        },
        onError: (error) => {
          setOpen(false);
          notify({ severity: 'error', message: describeRoleError(error).message });
        },
      });
    },
    cancel: () => {
      setOpen(false);
    },
  };
}
