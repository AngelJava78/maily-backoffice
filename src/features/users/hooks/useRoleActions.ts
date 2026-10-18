import { useState } from 'react';

import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

import type { AssignableRole } from '../api/assignRoles';
import { useAddUserRole } from './useAddUserRole';
import { useNotifyUserError } from './useNotifyUserError';
import { useRemoveUserRole } from './useRemoveUserRole';

interface RoleActionsOptions {
  readonly userId: number;
  /** Called when a role was taken away, with the roles on screen already refreshed. */
  readonly onRemoved: () => void;
}

/** The role that is about to be taken away. `open` ends before `role` does, to leave the dialog fading out. */
interface Removal {
  readonly role: AssignableRole;
  readonly open: boolean;
}

/**
 * What the panel of roles does with them: the dialog to add a role and the confirmation to take one
 * away, each with its mutation and what the person is told. It lives in the panel, not in each row,
 * because a row goes away with the role it shows and its callbacks would go with it. Every dialog
 * closes when its action ends, however it ended, with the result told in a notification.
 */
export function useRoleActions({ userId, onRemoved }: RoleActionsOptions) {
  const notify = useNotify();
  const notifyError = useNotifyUserError();
  const add = useAddUserRole(userId);
  const remove = useRemoveUserRole(userId);
  const [adding, setAdding] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);

  const closeRemoval = () => {
    setRemoval((current) => (current === null ? null : { ...current, open: false }));
  };

  function confirmAdd(role: AssignableRole) {
    add.mutate(
      { role },
      {
        onSuccess: () => {
          notify({ severity: 'success', message: messages.users.addRole.added });
        },
        onError: (error) => {
          notifyError(error, 'assignRole');
        },
        onSettled: () => {
          setAdding(false);
        },
      },
    );
  }

  function confirmRemove() {
    if (removal === null) {
      return;
    }
    remove.mutate(
      { role: removal.role },
      {
        onSuccess: () => {
          notify({ severity: 'success', message: messages.users.removeRole.removed });
          onRemoved();
        },
        onError: (error) => {
          notifyError(error, 'unassignRole');
        },
        onSettled: closeRemoval,
      },
    );
  }

  return {
    adding,
    addPending: add.isPending,
    startAdding: () => {
      setAdding(true);
    },
    cancelAdding: () => {
      setAdding(false);
    },
    confirmAdd,
    removal,
    removePending: remove.isPending,
    startRemoving: (role: AssignableRole) => {
      setRemoval({ role, open: true });
    },
    cancelRemoving: closeRemoval,
    confirmRemove,
  };
}
