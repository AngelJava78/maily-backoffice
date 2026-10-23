import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useId } from 'react';

import { messages } from '@/shared/messages/es';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  /** What is about to happen. It names the affected resource, as the constitution asks (VI). */
  readonly message: string;
  readonly confirmLabel: string;
  /** Defaults to "Cancelar"; a dialog that is not itself cancelling something (e.g. a warning
   * about to discard unsaved changes) can name its safe action instead (e.g. "Quedarme"). */
  readonly cancelLabel?: string;
  /** The action is running: nothing can be clicked and the dialog cannot be dismissed. */
  readonly pending?: boolean;
  /** `danger` paints the confirm button as a destructive action; the label still says what it does. */
  readonly tone?: 'default' | 'danger';
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /** Called once the dialog has finished closing, which is when a notice can be announced. */
  readonly onExited?: () => void;
}

/**
 * Asks for an explicit confirmation before an action that is hard to undo or changes who can enter.
 * The focus starts on the safe action ("Cancelar"), Escape and a click outside cancel, and while
 * the action is pending the dialog cannot be left. MUI traps the focus inside and gives it back to
 * the button that opened the dialog.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = messages.common.cancel,
  pending = false,
  tone = 'default',
  onConfirm,
  onCancel,
  onExited,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="xs"
      onClose={() => {
        if (!pending) {
          onCancel();
        }
      }}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{ transition: { onExited } }}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        {/* The focus starts on the safe action (WAI-ARIA authoring practices for dialogs). */}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <Button onClick={onCancel} disabled={pending} autoFocus>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={tone === 'danger' ? 'error' : 'primary'}
          onClick={onConfirm}
          loading={pending}
          loadingPosition="start"
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
