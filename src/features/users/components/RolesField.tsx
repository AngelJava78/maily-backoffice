import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import type { Ref } from 'react';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';

import type { Role } from '../schemas/role';

interface RolesFieldProps {
  /** The catalog that was loaded; it may be empty. */
  readonly roles: readonly Role[];
  readonly loading: boolean;
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
  /** The ids of the roles chosen. */
  readonly value: readonly number[];
  readonly onChange: (roleIds: number[]) => void;
  readonly onBlur?: () => void;
  /** Where the form library puts its reference, so the focus can go to this field on an error. */
  readonly inputRef?: Ref<HTMLInputElement>;
  readonly error?: string;
}

/**
 * Chooses one or more roles of the catalog. A user cannot be created without roles, so what is
 * shown depends on the catalog: loading (disabled, with an indicator), failed (the error with a
 * retry), empty (it says so) or ready (a multiple selection operated with the keyboard). It
 * handles ids and shows names; scales better than a group of checkboxes with up to 100 roles.
 */
export function RolesField({
  roles,
  loading,
  loadFailed,
  onRetry,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
}: RolesFieldProps) {
  if (loadFailed) {
    return (
      <ErrorState
        title={messages.users.form.rolesLoadError.title}
        message={messages.users.form.rolesLoadError.message}
        onRetry={onRetry}
      />
    );
  }
  if (!loading && roles.length === 0) {
    return <Alert severity="warning">{messages.users.form.rolesEmpty}</Alert>;
  }

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      disabled={loading}
      options={roles}
      value={roles.filter((role) => value.includes(role.id))}
      getOptionLabel={(role) => role.name}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      onChange={(_event, chosen) => {
        onChange(chosen.map((role) => role.id));
      }}
      onBlur={onBlur}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          label={messages.users.form.fields.roles}
          required
          error={error !== undefined}
          helperText={error}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: loading ? (
                <CircularProgress size={20} aria-label={messages.common.loading} />
              ) : (
                params.slotProps.input.endAdornment
              ),
            },
          }}
        />
      )}
    />
  );
}
