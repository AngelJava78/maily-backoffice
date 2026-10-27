import TextField from '@mui/material/TextField';
import { useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { SubscriptionFormValues } from '../schemas/subscriptionForm';
import { SUBSCRIPTION_TYPE } from '../schemas/subscriptionTypeCatalog';

const text = messages.subscriptions.form;

interface ClinicsLimitFieldProps {
  readonly register: UseFormRegister<SubscriptionFormValues>;
  readonly control: Control<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
}

/**
 * Fixed at 1 and disabled for an Individual subscription (FR-005); editable from 1 to 100 for any
 * other type (FR-006). Reads the sibling `subscriptionTypeId` live (research D3): the type control
 * already leaves this field at a valid value for the type it switches to (research D6), so this
 * component only has to decide whether to disable it, never to reset its value itself.
 */
export function ClinicsLimitField({ register, control, errors }: ClinicsLimitFieldProps) {
  const subscriptionTypeId = useWatch({ control, name: 'subscriptionTypeId' });
  const disabled = subscriptionTypeId === SUBSCRIPTION_TYPE.INDIVIDUAL;
  const { ref, ...registration } = register('clinicsLimit');
  const error = errors.clinicsLimit?.message;

  return (
    <TextField
      {...registration}
      inputRef={ref}
      label={text.fields.clinicsLimit}
      required
      disabled={disabled}
      autoComplete="off"
      error={error !== undefined}
      helperText={error ?? (disabled ? text.clinicsLimitFixedHelper : text.clinicsLimitHelper)}
      sx={{ maxWidth: { sm: 280 } }}
      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
    />
  );
}
