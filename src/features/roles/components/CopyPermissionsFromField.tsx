import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import type { Ref } from 'react';

import { messages } from '@/shared/messages/es';

import type { Role } from '../schemas/role';

const text = messages.roles.form;

interface CopyPermissionsFromFieldProps {
  /** The type chosen in the form: only roles of this same type can be offered (FR-006, FR-012). */
  readonly typeId: 1 | 2;
  readonly roles: readonly Role[];
  readonly value: number | null;
  readonly onChange: (roleId: number | null) => void;
  readonly onBlur?: () => void;
  /** Where the form library puts its reference, so the focus can go to this field on an error. */
  readonly inputRef?: Ref<HTMLInputElement>;
}

/**
 * "Copiar permisos de" (Historia 2): optional, offers only roles of the same type as the one being
 * created, so there is never a choice that research D7's copy step could not honor. A `value` that
 * no longer matches an offered role (the form's own type changed since it was chosen) simply shows
 * nothing selected; `RoleFormDialog` is the one that resets it when the type changes.
 */
export function CopyPermissionsFromField({
  typeId,
  roles,
  value,
  onChange,
  onBlur,
  inputRef,
}: CopyPermissionsFromFieldProps) {
  const options = roles.filter((role) => role.type.id === typeId);
  const selected = options.find((role) => role.id === value) ?? null;

  return (
    <Autocomplete
      options={options}
      value={selected}
      getOptionLabel={(role) => role.name}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      onChange={(_event, chosen) => {
        onChange(chosen?.id ?? null);
      }}
      onBlur={onBlur}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          label={text.copyFrom}
          helperText={text.copyFromHelper}
        />
      )}
    />
  );
}
