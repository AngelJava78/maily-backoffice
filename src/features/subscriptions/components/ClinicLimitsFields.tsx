import TextField from '@mui/material/TextField';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { SubscriptionFormValues } from '../schemas/subscriptionForm';

const text = messages.subscriptions.form;

interface ClinicLimitsFieldsProps {
  readonly register: UseFormRegister<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
}

const FIELDS = [
  [
    'consultingRoomsLimit',
    text.fields.consultingRoomsLimit,
    text.consultingRoomsLimitHelper,
  ] as const,
  ['doctorsLimit', text.fields.doctorsLimit, text.doctorsLimitHelper] as const,
  ['assistantsLimit', text.fields.assistantsLimit, text.assistantsLimitHelper] as const,
  [
    'newPatientsPerYearLimit',
    text.fields.newPatientsPerYearLimit,
    text.newPatientsPerYearLimitHelper,
  ] as const,
];

/** The four ceilings a plan gives the clinic (FR-010): all four required, 0 to 1,000,000 each. */
export function ClinicLimitsFields({ register, errors }: ClinicLimitsFieldsProps) {
  return (
    <>
      {FIELDS.map(([name, label, helper]) => {
        const { ref, ...registration } = register(name);
        const error = errors[name]?.message;
        return (
          <TextField
            key={name}
            {...registration}
            inputRef={ref}
            label={label}
            required
            autoComplete="off"
            error={error !== undefined}
            helperText={error ?? helper}
            sx={{ maxWidth: { sm: 280 } }}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        );
      })}
    </>
  );
}
