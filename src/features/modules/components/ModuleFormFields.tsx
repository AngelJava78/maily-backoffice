import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import { MODULE_ACTION_ORDER, REQUIRED_ACTION_KEY, type ModuleActionKey } from '../schemas/moduleActionCatalog';
import type { ModuleFormValues } from '../schemas/moduleForm';

const text = messages.modules.form;

interface ModuleFormFieldsProps {
  readonly register: UseFormRegister<ModuleFormValues>;
  readonly errors: FieldErrors<ModuleFormValues>;
  /** The module's key, to show under each action its real permission name (`<key>:<acción>`). */
  readonly moduleKey: string;
  /**
   * The help text under Orden: alta and edición mean something different when it is left empty
   * (research D13: "goes to the end" vs. "stays as it was", FR-011), so the caller supplies the
   * exact text instead of a number this component would have to interpret.
   */
  readonly orderHelp: string;
  readonly actions: ReadonlySet<ModuleActionKey>;
  /** The parent owns `actions` (US3 needs to confirm before applying an uncheck, research D9). */
  readonly onActionToggle: (action: ModuleActionKey, checked: boolean) => void;
}

/**
 * The fields alta and edición share (constitution VI): name, description, order and the actions a
 * module has. Clave and Tipo are not here — the caller renders them its own way (editable cards at
 * alta, fixed information at edición, data-model.md "Formulario").
 */
export function ModuleFormFields({
  register,
  errors,
  moduleKey,
  orderHelp,
  actions,
  onActionToggle,
}: ModuleFormFieldsProps) {
  const { ref: nameRef, ...name } = register('name');
  const { ref: descriptionRef, ...description } = register('description');
  const { ref: sortOrderRef, ...sortOrder } = register('sortOrder');

  return (
    <>
      <TextField
        {...name}
        inputRef={nameRef}
        label={text.fields.name}
        required
        fullWidth
        autoComplete="off"
        error={errors.name !== undefined}
        helperText={errors.name?.message ?? text.fields.nameHelp}
      />
      <TextField
        {...description}
        inputRef={descriptionRef}
        label={text.fields.description}
        multiline
        minRows={2}
        fullWidth
        error={errors.description !== undefined}
        helperText={errors.description?.message ?? text.fields.descriptionHelp}
      />
      <TextField
        {...sortOrder}
        inputRef={sortOrderRef}
        label={text.fields.order}
        autoComplete="off"
        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        sx={{ maxWidth: { sm: 240 } }}
        error={errors.sortOrder !== undefined}
        helperText={errors.sortOrder?.message ?? orderHelp}
      />

      <Stack component="fieldset" spacing={1} sx={{ border: 'none', p: 0, m: 0 }}>
        <FormLabel component="legend" sx={{ p: 0 }}>
          {text.fields.actionsLabel}
        </FormLabel>
        <Typography variant="body2" color="text.secondary">
          {text.actionsHelp}
        </Typography>
        <FormGroup>
          {MODULE_ACTION_ORDER.map((action) => (
            <Stack key={action} direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={actions.has(action)}
                    disabled={action === REQUIRED_ACTION_KEY}
                    onChange={(event) => {
                      onActionToggle(action, event.target.checked);
                    }}
                  />
                }
                label={messages.modules.actions[action]}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {`${moduleKey}:${action}`}
              </Typography>
            </Stack>
          ))}
        </FormGroup>
      </Stack>
    </>
  );
}
