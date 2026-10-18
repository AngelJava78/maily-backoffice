import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import type { ReactNode, SubmitEventHandler } from 'react';
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
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box component="form" noValidate onSubmit={onSubmit}>
        <Stack spacing={3}>
          {error !== undefined && <Alert severity="error">{error}</Alert>}
          {children}
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" loading={pending} disabled={saveDisabled}>
              {messages.users.form.save}
            </Button>
            <Button component={RouterLink} to={cancelTo} state={cancelState}>
              {messages.common.cancel}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}
