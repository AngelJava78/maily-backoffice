import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';

import { useRolesCatalog } from '../hooks/useRolesCatalog';
import type { Role } from '../schemas/role';

const text = messages.users.addRole;

interface AddRoleDialogProps {
  readonly open: boolean;
  /** The full name of the user, to say who is going to get the role. */
  readonly userName: string;
  /** The roles that the user already has: they are not offered again. */
  readonly assignedRoleIds: readonly number[];
  /** The role is being added: nothing can be used and the dialog cannot be dismissed. */
  readonly pending?: boolean;
  readonly onConfirm: (role: Role) => void;
  readonly onCancel: () => void;
}

interface BodyProps {
  readonly titleId: string;
  readonly userName: string;
  readonly pending: boolean;
  /** `undefined` while the catalog is not there: loading, or failed. */
  readonly available: readonly Role[] | undefined;
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
  readonly onConfirm: (role: Role) => void;
  readonly onCancel: () => void;
}

/**
 * The content of the dialog. It lives only while the dialog does, so the role chosen is forgotten
 * when it closes and each opening starts with nothing chosen.
 */
function AddRoleBody({
  titleId,
  userName,
  pending,
  available,
  loadFailed,
  onRetry,
  onConfirm,
  onCancel,
}: BodyProps) {
  const [chosen, setChosen] = useState<Role | null>(null);
  // Only a role that is still on offer counts: the list can change while the dialog is open.
  const selected = available?.find((role) => role.id === chosen?.id) ?? null;

  function selector() {
    if (loadFailed) {
      return (
        <ErrorState
          title={messages.users.roles.loadError.title}
          message={messages.users.roles.loadError.message}
          onRetry={onRetry}
        />
      );
    }
    if (available === undefined) {
      return <CircularProgress size={28} aria-label={messages.common.loading} />;
    }
    if (available.length === 0) {
      return <Alert severity="info">{text.none}</Alert>;
    }
    return (
      <Autocomplete
        options={available}
        value={selected}
        disabled={pending}
        getOptionLabel={(role) => role.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        onChange={(_event, role) => {
          setChosen(role);
        }}
        renderInput={(params) => (
          // The selector is the only thing to do here, so the focus starts on it.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          <TextField {...params} label={text.roleLabel} autoFocus />
        )}
      />
    );
  }

  return (
    <>
      <DialogTitle id={titleId}>{text.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {selector()}
          {/* Always in the page, so a screen reader announces the summary when it fills in. */}
          <Typography role="status" variant="body2" sx={{ minHeight: '3em' }}>
            {selected === null ? '' : text.summary(selected.name, userName)}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onCancel} disabled={pending}>
          {messages.common.cancel}
        </Button>
        <Button
          variant="contained"
          disabled={selected === null}
          loading={pending}
          loadingPosition="start"
          onClick={() => {
            if (selected !== null) {
              onConfirm(selected);
            }
          }}
        >
          {text.confirm}
        </Button>
      </DialogActions>
    </>
  );
}

/**
 * Asks which role to give to a user (FR-015). It offers the roles of the catalog that the user does
 * not have yet, says who is going to get which role, and does nothing until it is confirmed. The
 * catalog is asked for only while the dialog is open. MUI keeps the focus inside and gives it back
 * to the button that opened the dialog.
 */
export function AddRoleDialog({
  open,
  userName,
  assignedRoleIds,
  pending = false,
  onConfirm,
  onCancel,
}: AddRoleDialogProps) {
  const titleId = useId();
  const catalog = useRolesCatalog({ enabled: open });
  const available = catalog.data?.filter((role) => !assignedRoleIds.includes(role.id));

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="xs"
      aria-labelledby={titleId}
      onClose={() => {
        if (!pending) {
          onCancel();
        }
      }}
    >
      <AddRoleBody
        titleId={titleId}
        userName={userName}
        pending={pending}
        available={available}
        loadFailed={catalog.isError && available === undefined}
        onRetry={() => {
          void catalog.refetch();
        }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Dialog>
  );
}
