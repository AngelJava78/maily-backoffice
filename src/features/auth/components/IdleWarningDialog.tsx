import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect, useState } from 'react';

import { messages } from '@/shared/messages/es';

interface IdleWarningDialogProps {
  readonly open: boolean;
  /** Milliseconds left before the session closes. */
  readonly getRemainingTimeMs: () => number;
  readonly onContinue: () => void;
  readonly onLogout: () => void;
}

const toSeconds = (milliseconds: number): number => Math.ceil(milliseconds / 1_000);

/** The countdown lives apart so it starts from the real time left each time the dialog opens. */
function Countdown({ getRemainingTimeMs }: { readonly getRemainingTimeMs: () => number }) {
  const [seconds, setSeconds] = useState(() => toSeconds(getRemainingTimeMs()));

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(toSeconds(getRemainingTimeMs()));
    }, 1_000);
    return () => {
      clearInterval(timer);
    };
  }, [getRemainingTimeMs]);

  return <>{messages.idleDialog.body(seconds)}</>;
}

/**
 * Warns that the session is about to close for inactivity (FR-020). It is an alert dialog: it
 * traps the focus, starts on "Continuar" and can be operated with the keyboard; Escape continues.
 */
export function IdleWarningDialog({
  open,
  getRemainingTimeMs,
  onContinue,
  onLogout,
}: IdleWarningDialogProps) {
  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="xs"
      onClose={(_event, reason) => {
        if (reason === 'escapeKeyDown') {
          onContinue();
        }
      }}
      slotProps={{ paper: { role: 'alertdialog' } }}
      aria-labelledby="idle-dialog-title"
      aria-describedby="idle-dialog-description"
    >
      <DialogTitle id="idle-dialog-title">{messages.idleDialog.title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="idle-dialog-description">
          <Countdown getRemainingTimeMs={getRemainingTimeMs} />
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onLogout}>{messages.common.logout}</Button>
        {/* An alert dialog puts the focus on its safe action (WAI-ARIA authoring practices). */}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <Button variant="contained" onClick={onContinue} autoFocus>
          {messages.idleDialog.continue}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
