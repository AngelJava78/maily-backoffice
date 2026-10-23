import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { SubscriptionFormValues } from '../schemas/subscriptionForm';

const text = messages.subscriptions.form;

interface SelfServiceAndTrialFieldsProps {
  readonly register: UseFormRegister<SubscriptionFormValues>;
  readonly control: Control<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
}

/** Autoconsumo (FR-013) and days of trial (FR-013), next to each other as in the mockup. */
export function SelfServiceAndTrialFields({
  register,
  control,
  errors,
}: SelfServiceAndTrialFieldsProps) {
  const { ref, ...trialDays } = register('trialDays');
  const trialDaysError = errors.trialDays?.message;

  return (
    <Stack spacing={1}>
      <Controller
        control={control}
        name="selfService"
        render={({ field: { value, onChange, ...field } }) => (
          <FormControlLabel
            control={
              <Switch
                {...field}
                checked={value}
                onChange={(_event, checked) => {
                  onChange(checked);
                }}
              />
            }
            label={
              <>
                <Typography component="span">{text.fields.selfService}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {text.selfServiceHelper}
                </Typography>
              </>
            }
          />
        )}
      />
      <TextField
        {...trialDays}
        inputRef={ref}
        label={text.fields.trialDays}
        autoComplete="off"
        error={trialDaysError !== undefined}
        helperText={trialDaysError ?? text.trialDaysHelper}
        sx={{ maxWidth: { sm: 280 } }}
        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      />
    </Stack>
  );
}
