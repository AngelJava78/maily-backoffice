import Button from '@mui/material/Button';
import { useState } from 'react';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

import { useChangeRoleStatusAction } from '../hooks/useChangeRoleStatusAction';

const text = messages.roles.status;

interface BlockRoleActionProps {
  readonly role: { readonly id: number; readonly name: string };
  /** There are unsaved changes or a save is running: blocking waits for them (FR-013). */
  readonly disabled: boolean;
  /** The role was blocked (or already was): the caller closes its detail. */
  readonly onBlocked: () => void;
}

/**
 * "Bloquear role" and its confirmation (FR-013, research D6): the role is not blocked until the
 * person confirms, after reading who stops receiving what it grants. While blocking, the dialog
 * cannot be left and its button shows the work (FR-016). Cancelling hands the focus back to this
 * button (MUI); once blocked, the caller moves it, since the button goes away with the detail.
 */
export function BlockRoleAction({ role, disabled, onBlocked }: BlockRoleActionProps) {
  const [confirming, setConfirming] = useState(false);
  // Closed on a failure too, as "Eliminar role" does: the error notice is not hidden behind the
  // dialog, and "Bloquear role" is still there to try again.
  const action = useChangeRoleStatusAction(
    role,
    'block',
    () => {
      setConfirming(false);
      onBlocked();
    },
    () => {
      setConfirming(false);
    },
  );

  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {text.block}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={text.confirmTitle(role.name)}
        message={text.confirmBody(role.name)}
        confirmLabel={text.confirm}
        cancelLabel={text.cancel}
        tone="danger"
        pending={action.pending}
        onConfirm={action.run}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </>
  );
}
