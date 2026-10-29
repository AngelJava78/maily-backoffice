import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { useController, type Control, type FieldErrors } from 'react-hook-form';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';

import { resolveModuleSelection } from '../policy/clinicModuleSelection';
import { REQUIRED_MODULE_KEY, type ClinicModule } from '../schemas/clinicModule';
import type { SubscriptionFormValues } from '../schemas/subscriptionForm';

const text = messages.subscriptions.modules;
const fieldLabel = messages.subscriptions.detail.fields.modules;

interface ModulesFieldProps {
  readonly control: Control<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
  /** The vigente catalog of active clinic modules (021, FR-001/FR-002), in the order to show it. */
  readonly modules: readonly ClinicModule[];
  readonly loading: boolean;
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
}

/**
 * The clinic modules a plan can include (021, FR-001 to FR-009), fed by the vigente catalog instead
 * of a fixed list: a controlled field that does not fetch anything itself (research D5, same pattern
 * as `RolesField` of `features/users`). «Pacientes» (`REQUIRED_MODULE_KEY`) is always checked and
 * disabled, forced by `resolveModuleSelection` even when the current selection does not have it; no
 * other dependency between modules applies any more (Clarifications).
 */
export function ModulesField({
  control,
  errors,
  modules,
  loading,
  loadFailed,
  onRetry,
}: ModulesFieldProps) {
  const helpId = useId();
  const errorId = useId();
  const {
    field: { value: selected, onChange },
  } = useController({ control, name: 'moduleKeys' });
  const error = errors.moduleKeys?.message;
  const ready = !loading && !loadFailed && modules.length > 0;
  const effective = resolveModuleSelection(selected, modules);

  function content() {
    if (loadFailed) {
      return (
        <ErrorState
          title={text.loadError.title}
          message={text.loadError.message}
          onRetry={onRetry}
        />
      );
    }
    if (loading) {
      return <CircularProgress aria-label={messages.common.loading} />;
    }
    if (modules.length === 0) {
      return <Alert severity="warning">{text.empty}</Alert>;
    }
    return (
      <>
        <Typography id={helpId} variant="body2" color="text.secondary">
          {text.marked(effective.size, modules.length)}
        </Typography>
        <Stack spacing={1} sx={{ mt: 2 }}>
          {modules.map((module) => {
            const isRequired = module.key === REQUIRED_MODULE_KEY;
            return (
              <FormControlLabel
                key={module.key}
                control={
                  <Checkbox
                    checked={effective.has(module.key)}
                    disabled={isRequired}
                    onChange={(_event, checked) => {
                      const next = new Set(selected);
                      if (checked) {
                        next.add(module.key);
                      } else {
                        next.delete(module.key);
                      }
                      onChange(next);
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
                    {module.description !== null && (
                      <Typography variant="body2" color="text.secondary">
                        {module.description}
                      </Typography>
                    )}
                  </Box>
                }
              />
            );
          })}
        </Stack>
      </>
    );
  }

  return (
    <Box
      component="fieldset"
      aria-describedby={
        [ready ? helpId : undefined, error === undefined ? undefined : errorId]
          .filter((id): id is string => id !== undefined)
          .join(' ') || undefined
      }
      sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
    >
      <Typography component="legend" variant="subtitle1" sx={{ fontWeight: 'bold', p: 0 }}>
        {fieldLabel}
      </Typography>
      {error !== undefined && (
        <FormHelperText id={errorId} error sx={{ mx: 0 }}>
          {error}
        </FormHelperText>
      )}
      {content()}
    </Box>
  );
}
