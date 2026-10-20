import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useEffect, useRef, type ReactNode, type SubmitEventHandler } from 'react';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';

interface UserFormProps {
  readonly onSubmit: SubmitEventHandler<HTMLFormElement>;
  /** The form is being saved: it cannot be saved again meanwhile (FR-007). */
  readonly pending: boolean;
  /** Keeps the form from being saved for another reason, such as a catalog that did not load. */
  readonly saveDisabled?: boolean;
  /** A general error, which does not belong to one field. */
  readonly error?: string;
  /** Where "Cancelar" goes; nothing is asked about changes that were not saved. */
  readonly cancelTo: string;
  /** The state of the history entry that "Cancelar" opens, such as the list the person came from. */
  readonly cancelState?: unknown;
  readonly children: ReactNode;
}

/**
 * The frame that the creation and the edition of a user share (constitution VI): the fields, the
 * general error, "Guardar" and "Cancelar". The browser does not validate (`noValidate`): React
 * Hook Form does, with the schemas, so every error looks the same.
 */
export function UserForm({
  onSubmit,
  pending,
  saveDisabled = false,
  error,
  cancelTo,
  cancelState,
  children,
}: UserFormProps) {
  const errorRef = useRef<HTMLDivElement>(null);

  // The error is at the top of the form and the person is at the bottom, on "Guardar": at a narrow
  // width, or with the page zoomed in, it would be out of sight. Taking the focus to it also makes
  // a screen reader read it; each time there is one it is told again, because the form clears it
  // when it is saved again.
  useEffect(() => {
    if (error !== undefined) {
      errorRef.current?.focus();
    }
  }, [error]);

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box component="form" noValidate onSubmit={onSubmit}>
        <Stack spacing={3}>
          {error !== undefined && (
            <Alert ref={errorRef} tabIndex={-1} severity="error">
              {error}
            </Alert>
          )}
          {children}
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" loading={pending} disabled={saveDisabled}>
              {messages.users.form.save}
            </Button>
            {/* Leaving does not stop a save that already left, and its result would take the person back. */}
            <Button component={RouterLink} to={cancelTo} state={cancelState} disabled={pending}>
              {messages.common.cancel}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}
