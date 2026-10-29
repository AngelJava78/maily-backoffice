import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { ClinicModule } from '../schemas/clinicModule';
import type { SubscriptionFormValues } from '../schemas/subscriptionForm';
import { ClinicLimitsFields } from './ClinicLimitsFields';
import { ClinicsLimitField } from './ClinicsLimitField';
import { ModulesField } from './ModulesField';
import { OtherFeaturesField } from './OtherFeaturesField';
import { SelfServiceAndTrialFields } from './SelfServiceAndTrialFields';
import { SubscriptionTypeField } from './SubscriptionTypeField';

const text = messages.subscriptions.form;

interface SubscriptionFormFieldsProps {
  readonly register: UseFormRegister<SubscriptionFormValues>;
  readonly control: Control<SubscriptionFormValues>;
  readonly setValue: UseFormSetValue<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
  /** Only the edition passes this: the type is fixed forever once created (FR-004, research D3). */
  readonly disableSubscriptionType?: boolean;
  /** The vigente catalog of active clinic modules (021), fetched by the page that owns this form. */
  readonly clinicModules: {
    readonly modules: readonly ClinicModule[];
    readonly loading: boolean;
    readonly loadFailed: boolean;
    readonly onRetry: () => void;
  };
}

/**
 * The fields that the creation and the edition of a subscription share (constitution VI: one form
 * for both): the subscription type, data generales, autoconsumo and trial days, the clinic
 * modules, the clinic limits and other features. There is no status: a subscription is born
 * active, and its status changes with its own action. They receive the registrations and the
 * errors of the form, so they know nothing about the form that holds them.
 */
export function SubscriptionFormFields({
  register,
  control,
  setValue,
  errors,
  disableSubscriptionType = false,
  clinicModules,
}: SubscriptionFormFieldsProps) {
  // The references go to the inputs themselves, so the form can put the focus on a field with an error.
  const { ref: nameRef, ...name } = register('name');
  const { ref: descriptionRef, ...description } = register('description');
  const { ref: priceRef, ...price } = register('monthlyPrice');
  const { ref: annualPriceRef, ...annualPrice } = register('annualPrice');

  return (
    <Stack spacing={3}>
      <SubscriptionTypeField
        control={control}
        setValue={setValue}
        errors={errors}
        disabled={disableSubscriptionType}
      />
      <Stack spacing={2}>
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
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <TextField
            {...price}
            inputRef={priceRef}
            label={text.fields.monthlyPrice}
            required
            autoComplete="off"
            error={errors.monthlyPrice !== undefined}
            helperText={errors.monthlyPrice?.message ?? text.priceHelper}
            sx={{ maxWidth: { sm: 320 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">{text.pricePrefix}</InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">{text.priceSuffix}</InputAdornment>,
              },
              htmlInput: { inputMode: 'decimal' },
            }}
          />
          <TextField
            {...annualPrice}
            inputRef={annualPriceRef}
            label={text.fields.annualPrice}
            required
            autoComplete="off"
            error={errors.annualPrice !== undefined}
            helperText={errors.annualPrice?.message ?? text.annualPriceHelper}
            sx={{ maxWidth: { sm: 320 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">{text.pricePrefix}</InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">{text.annualPriceSuffix}</InputAdornment>
                ),
              },
              htmlInput: { inputMode: 'decimal' },
            }}
          />
        </Stack>
      </Stack>
      <SelfServiceAndTrialFields register={register} control={control} errors={errors} />
      <ModulesField
        control={control}
        errors={errors}
        modules={clinicModules.modules}
        loading={clinicModules.loading}
        loadFailed={clinicModules.loadFailed}
        onRetry={clinicModules.onRetry}
      />
      <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
        <Typography component="legend" variant="subtitle1" sx={{ fontWeight: 'bold', p: 0 }}>
          {text.fields.limits}
        </Typography>
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
          <ClinicsLimitField register={register} control={control} errors={errors} />
          <ClinicLimitsFields register={register} errors={errors} />
        </Stack>
      </Box>
      <OtherFeaturesField control={control} register={register} errors={errors.otherFeatures} />
    </Stack>
  );
}
