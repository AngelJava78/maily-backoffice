import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { SubscriptionFormValues } from '../schemas/subscriptionForm';
import { FeaturesField } from './FeaturesField';

const text = messages.subscriptions.form;

interface SubscriptionFormFieldsProps {
  readonly register: UseFormRegister<SubscriptionFormValues>;
  readonly control: Control<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
}

/**
 * The fields that the creation and the edition of a subscription share (constitution VI: one form
 * for both): the name, the description, the monthly price and what it includes. There is no status:
 * a subscription is born active, and its status changes with its own action. They receive the
 * registrations and the errors of the form, so they know nothing about the form that holds them.
 */
export function SubscriptionFormFields({ register, control, errors }: SubscriptionFormFieldsProps) {
  // The references go to the inputs themselves, so the form can put the focus on a field with an error.
  const { ref: nameRef, ...name } = register('name');
  const { ref: descriptionRef, ...description } = register('description');
  const { ref: priceRef, ...price } = register('monthlyPrice');

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
        helperText={errors.name?.message}
      />
      <TextField
        {...description}
        inputRef={descriptionRef}
        label={text.fields.description}
        multiline
        minRows={3}
        fullWidth
        error={errors.description !== undefined}
        helperText={errors.description?.message ?? text.descriptionHelper}
      />
      <TextField
        {...price}
        inputRef={priceRef}
        label={text.fields.monthlyPrice}
        required
        autoComplete="off"
        error={errors.monthlyPrice !== undefined}
        helperText={errors.monthlyPrice?.message ?? text.priceHelper}
        sx={{ maxWidth: { sm: 360 } }}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start">{text.pricePrefix}</InputAdornment>,
            endAdornment: <InputAdornment position="end">{text.priceSuffix}</InputAdornment>,
          },
          htmlInput: { inputMode: 'decimal' },
        }}
      />
      <FeaturesField control={control} register={register} errors={errors.features} />
    </>
  );
}
