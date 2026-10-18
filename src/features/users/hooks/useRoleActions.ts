import { useState } from 'react';

import { messages } from '@/shared/messages/es';
import { useDeferredNotice } from '@/shared/ui/useDeferredNotice';

import type { AssignableRole } from '../api/assignRoles';
import { useAddUserRole } from './useAddUserRole';
import { useNotifyUserError } from './useNotifyUserError';
import { useRemoveUserRole } from './useRemoveUserRole';

/** The role that is about to be taken away. `open` ends before `role` does, to leave the dialog fading out. */
export interface Removal {
  readonly role: AssignableRole;
  readonly open: boolean;
}

export interface RoleActions {
  readonly adding: boolean;
  readonly addPending: boolean;
  readonly startAdding: () => void;
  readonly cancelAdding: () => void;
  readonly confirmAdd: (role: AssignableRole) => void;
  readonly removal: Removal | null;
  readonly removePending: boolean;
  readonly startRemoving: (role: AssignableRole) => void;
  readonly cancelRemoving: () => void;
  readonly confirmRemove: () => void;
  /** Tells how the last action went. The dialogs call it when they have finished closing. */
  readonly announce: () => void;
}

/**
 * What the panel of roles does with them: the dialog to add a role and the confirmation to take one
 * away, each with its mutation and what the person is told. It lives in the panel, not in each row,
 * because a row goes away with the role it shows and its callbacks would go with it. Every dialog
 * closes when its action ends, however it ended, and the result is told once it has closed: the
 * rest of the page is hidden from a screen reader while a dialog is on screen.
 */
export function useRoleActions(userId: number): RoleActions {
  const { defer, flush } = useDeferredNotice();
  const notifyError = useNotifyUserError(defer);
  const add = useAddUserRole(userId);
  const remove = useRemoveUserRole(userId);
  const [adding, setAdding] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);

  const closeRemoval = () => {
    setRemoval((current) => (current === null ? null : { ...current, open: false }));
  };

  function confirmAdd(role: AssignableRole) {
    // A dialog that is fading out can still be clicked: what it asked was already sent.
    if (!adding) {
      return;
    }
    add.mutate(
      { role },
      {
        onSuccess: () => {
          defer({ severity: 'success', message: messages.users.addRole.added });
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
    if (!removal?.open) {
      return;
    }
    remove.mutate(
      { role: removal.role },
      {
        onSuccess: () => {
          defer({ severity: 'success', message: messages.users.removeRole.removed });
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
    startRemoving: (role) => {
      setRemoval({ role, open: true });
    },
    cancelRemoving: closeRemoval,
    confirmRemove,
    announce: flush,
  };
}
