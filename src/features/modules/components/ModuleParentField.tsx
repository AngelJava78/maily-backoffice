import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { Controller, type Control } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { ModuleFormValues } from '../schemas/moduleForm';
import type { ParentModuleRef } from '../schemas/systemModule';

const text = messages.modules.form.fields;

interface ModuleParentFieldProps {
  readonly control: Control<ModuleFormValues>;
  /** The modules it can be given as parent now (`useParentModuleOptions`). */
  readonly options: readonly ParentModuleRef[];
  /** `loading` and `error` refer to the options, not to the form (contracts/modules-tree-ui.md §5). */
  readonly status: 'loading' | 'error' | 'ready';
  /** The parent the module has right now: shown as a value even if it is not offered (a Blocked one). */
  readonly currentParent: ParentModuleRef | null;
  /** Why the parent cannot be changed (FR-012), or `undefined` when it can. */
  readonly lockedReason?: string;
  /** The refusal of the service about the parent, if any. */
  readonly error?: string;
}

/**
 * The "Módulo padre" field of alta and edición (spec 024, FR-010 to FR-012; research D7): the
 * module it belongs to, or "Ninguno (módulo de primer nivel)". The first option is always there;
 * the current parent is added when it is not among the options, so it never looks empty.
 */
export function ModuleParentField({
  control,
  options,
  status,
  currentParent,
  lockedReason,
  error,
}: ModuleParentFieldProps) {
  const shown =
    currentParent === null || options.some((option) => option.id === currentParent.id)
      ? options
      : [currentParent, ...options];
  const helper =
    error ??
    lockedReason ??
    (status === 'loading'
      ? text.parentLoading
      : status === 'error'
        ? text.parentLoadError
        : text.parentHelp);

  return (
    <Controller
      name="parentModuleId"
      control={control}
      render={({ field }) => (
        <TextField
          select
          label={text.parent}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          fullWidth
          disabled={lockedReason !== undefined || status !== 'ready'}
          error={error !== undefined}
          helperText={helper}
          // "Ninguno" is the empty value: without this the field would look blank, and not chosen.
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="">{text.parentNone}</MenuItem>
          {shown.map((option) => (
            <MenuItem key={option.id} value={String(option.id)}>
              {option.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
