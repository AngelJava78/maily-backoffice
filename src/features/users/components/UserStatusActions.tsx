import BlockIcon from '@mui/icons-material/Block';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import RestoreIcon from '@mui/icons-material/Restore';
import Button from '@mui/material/Button';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useNotify } from '@/shared/ui/Notifications';

import { useChangeUserStatus, type StatusAction } from '../hooks/useChangeUserStatus';
import { useNotifyUserError } from '../hooks/useNotifyUserError';
import type { UserAction } from '../policy/availableActions';
import { getFullName, type PlatformUser } from '../schemas/user';

interface UserStatusActionsProps {
  readonly user: PlatformUser;
  /** What the operator may do with this user in its status (`getAvailableActions`). */
  readonly available: ReadonlySet<UserAction>;
}

/**
 * The changes of status that take the place of the main button, in the order in which they are
 * looked for. A user in a status admits only one of them.
 */
const MAIN_ACTIONS: readonly StatusAction[] = ['block', 'unblock', 'reactivate'];

const SUCCESS_NOTICE = {
  block: messages.users.statusNotices.blocked,
  unblock: messages.users.statusNotices.unblocked,
  delete: messages.users.statusNotices.deleted,
  reactivate: messages.users.statusNotices.reactivated,
} satisfies Record<StatusAction, string>;

const MAIN_ICON: Partial<Record<StatusAction, ReactNode>> = {
  block: <BlockIcon />,
  unblock: <LockOpenIcon />,
  reactivate: <RestoreIcon />,
};

/** Cutting the access or removing the user is serious; giving the access back is not. */
const DANGEROUS: ReadonlySet<StatusAction> = new Set(['block', 'delete']);

/** The action being confirmed. `open` ends before `action` does, to leave the dialog fading out. */
interface Confirmation {
  readonly action: StatusAction;
  readonly open: boolean;
}

/**
 * The actions that change the status of a user: block, unblock, delete and reactivate (FR-010,
 * FR-020, FR-022). Each asks first, naming the user, because it changes whether the person can sign
 * in. The main button is the same element before and after a change, so the focus stays where it
 * was and the person finds the opposite action under their finger; when the button that opened the
 * dialog goes away (delete), the focus goes to that one. The dialog closes when the action ends,
 * however it ended, with the result told in a notification.
 */
export function UserStatusActions({ user, available }: UserStatusActionsProps) {
  const notify = useNotify();
  const notifyError = useNotifyUserError();
  const change = useChangeUserStatus(user.id);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const focusMainWhenClosed = useRef(false);
  const main = MAIN_ACTIONS.find((action) => available.has(action));
  const dialogOpen = confirmation?.open === true;

  useEffect(() => {
    if (!dialogOpen && focusMainWhenClosed.current) {
      focusMainWhenClosed.current = false;
      mainRef.current?.focus();
    }
  }, [dialogOpen]);

  const ask = (action: StatusAction) => {
    setConfirmation({ action, open: true });
  };

  const close = () => {
    setConfirmation((current) => (current === null ? null : { ...current, open: false }));
  };

  function confirm() {
    if (confirmation === null) {
      return;
    }
    const { action } = confirmation;
    change.mutate(
      { action },
      {
        onSuccess: () => {
          notify({ severity: 'success', message: SUCCESS_NOTICE[action] });
          focusMainWhenClosed.current = true;
        },
        onError: (error) => {
          notifyError(error, action);
        },
        onSettled: close,
      },
    );
  }

  return (
    <>
      {main !== undefined && (
        <Button
          ref={mainRef}
          variant="outlined"
          color={main === 'block' ? 'warning' : 'primary'}
          startIcon={MAIN_ICON[main]}
          onClick={() => {
            ask(main);
          }}
        >
          {messages.users.actions[main]}
        </Button>
      )}
      {available.has('delete') && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          onClick={() => {
            ask('delete');
          }}
        >
          {messages.users.actions.delete}
        </Button>
      )}
      {confirmation !== null && (
        <ConfirmDialog
          open={confirmation.open}
          title={messages.users.dialogs[confirmation.action].title}
          message={messages.users.dialogs[confirmation.action].body(getFullName(user))}
          confirmLabel={messages.users.dialogs[confirmation.action].confirm}
          tone={DANGEROUS.has(confirmation.action) ? 'danger' : 'default'}
          pending={change.isPending}
          onConfirm={confirm}
          onCancel={close}
        />
      )}
    </>
  );
}
