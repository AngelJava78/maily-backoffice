import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { useWatch, type Control, type FieldErrors, type UseFormSetValue } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { SubscriptionFormValues } from '../schemas/subscriptionForm';
import { SUBSCRIPTION_TYPE } from '../schemas/subscriptionTypeCatalog';

const text = messages.subscriptions.form;
const catalog = messages.subscriptions.types.catalog;

interface SubscriptionTypeFieldProps {
  readonly control: Control<SubscriptionFormValues>;
  readonly setValue: UseFormSetValue<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
  /** Only at creation (FR-001); fixed forever once the subscription exists (FR-004). */
  readonly disabled?: boolean;
}

/**
 * Individual or Empresarial (FR-001, FR-002), as a single-line switch like Autoconsumo (research
 * D1, 019: visual only, no change of meaning from the toggle it replaces). Turning it decides both
 * the new type and the clinics limit, in the same event (research D6 of 019): a value valid for the
 * type it switches to, so `ClinicsLimitField` never has to detect "the type just changed".
 */
export function SubscriptionTypeField({
  control,
  setValue,
  errors,
  disabled = false,
}: SubscriptionTypeFieldProps) {
  const helpId = useId();
  const errorId = useId();
  const subscriptionTypeId = useWatch({ control, name: 'subscriptionTypeId' });
  const error = errors.subscriptionTypeId?.message;
  const checked = subscriptionTypeId === SUBSCRIPTION_TYPE.ENTERPRISE;
  const current = checked ? SUBSCRIPTION_TYPE.ENTERPRISE : SUBSCRIPTION_TYPE.INDIVIDUAL;

  return (
    <Box
      component="fieldset"
      aria-describedby={disabled ? helpId : undefined}
      sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
    >
      <Typography component="legend" variant="subtitle1" sx={{ fontWeight: 'bold', p: 0 }}>
        {text.fields.subscriptionType}
      </Typography>
      {disabled && (
        <Typography id={helpId} variant="body2" color="text.secondary">
          {text.subscriptionTypeImmutableHelper}
        </Typography>
      )}
      {error !== undefined && (
        <FormHelperText id={errorId} error sx={{ mx: 0 }}>
          {error}
        </FormHelperText>
      )}
      <FormControlLabel
        sx={{ mt: 1 }}
        control={
          <Switch
            checked={checked}
            disabled={disabled}
            onChange={(_event, next) => {
              setValue(
                'subscriptionTypeId',
                next ? SUBSCRIPTION_TYPE.ENTERPRISE : SUBSCRIPTION_TYPE.INDIVIDUAL,
              );
              setValue('clinicsLimit', '1', { shouldValidate: true });
            }}
          />
        }
        label={
          <>
            <Typography component="span" sx={{ fontWeight: 'bold' }}>
              {catalog[current].name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {catalog[current].description}
            </Typography>
          </>
        }
      />
    </Box>
  );
}
