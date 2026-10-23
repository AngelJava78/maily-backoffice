import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { useController, type Control, type FieldErrors } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import { withModuleChecked } from '../policy/moduleSelection';
import {
  CLINIC_MODULE_ORDER,
  MODULE_PREREQUISITE,
  REQUIRED_MODULE_KEY,
} from '../schemas/clinicModuleCatalog';
import type { SubscriptionFormValues } from '../schemas/subscriptionForm';

const text = messages.subscriptions.modules;
const fieldLabel = messages.subscriptions.detail.fields.modules;

interface ModulesFieldProps {
  readonly control: Control<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
}

/**
 * The nine clinic modules a plan can include (FR-007 to FR-009). "Pacientes" is always checked and
 * disabled; marking a dependent module marks its prerequisite in cascade, and unmarking a
 * prerequisite unmarks its dependents, so the form never holds a combination the API would reject
 * (research D4). A rejection the platform still raises (a race, FR-015) is shown here, next to the
 * section, never the server's own text.
 */
export function ModulesField({ control, errors }: ModulesFieldProps) {
  const helpId = useId();
  const errorId = useId();
  const {
    field: { value: selected, onChange },
  } = useController({ control, name: 'moduleKeys' });
  const error = errors.moduleKeys?.message;

  return (
    <Box
      component="fieldset"
      aria-describedby={error === undefined ? helpId : `${errorId} ${helpId}`}
      sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
    >
      <Typography component="legend" variant="subtitle1" sx={{ fontWeight: 'bold', p: 0 }}>
        {fieldLabel}
      </Typography>
      <Typography id={helpId} variant="body2" color="text.secondary">
        {text.marked(selected.size)}
      </Typography>
      {error !== undefined && (
        <FormHelperText id={errorId} error sx={{ mx: 0 }}>
          {error}
        </FormHelperText>
      )}
      <Stack spacing={1} sx={{ mt: 2 }}>
        {CLINIC_MODULE_ORDER.map((key) => {
          const module = text.catalog[key];
          const prerequisite = MODULE_PREREQUISITE[key];
          const isRequired = key === REQUIRED_MODULE_KEY;
          return (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  checked={selected.has(key)}
                  disabled={isRequired}
                  onChange={(_event, checked) => {
                    onChange(withModuleChecked(selected, key, checked));
                  }}
                />
              }
              label={
                <Box>
                  <Typography component="span">{module.name}</Typography>
                  {isRequired && (
                    <>
                      {' — '}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {text.alwaysIncluded}
                      </Typography>
                    </>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {module.description}
                    {prerequisite !== undefined &&
                      ` ${text.requires(text.catalog[prerequisite].name)}`}
                  </Typography>
                </Box>
              }
            />
          );
        })}
      </Stack>
    </Box>
  );
}
