import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { ComponentFormValues } from '../schemas/componentForm';
import type { RegisteredKind } from '../schemas/monitoredComponent';

const text = messages.health.registry;

interface ComponentFormFieldsProps {
  readonly register: UseFormRegister<ComponentFormValues>;
  readonly control: Control<ComponentFormValues>;
  readonly errors: FieldErrors<ComponentFormValues>;
  /** The edition shows the code and the kind as fixed information: they cannot change (FR-037). */
  readonly fixed?: { readonly code: string; readonly kind: RegisteredKind | 'unknown' };
  /** The creation proposes the routes of the kind that is chosen (FR-036). */
  readonly onKindChange?: (kind: RegisteredKind) => void;
}

/** A text input of the form, registered, with its error next to it or its help. */
function TextInput({
  register,
  errors,
  name,
  label,
  required = false,
  helper,
}: Pick<ComponentFormFieldsProps, 'register' | 'errors'> & {
  readonly name: 'name' | 'code' | 'baseUrl' | 'livePath' | 'readyPath' | 'infoPath' | 'sortOrder';
  readonly label: string;
  readonly required?: boolean;
  readonly helper?: string;
}) {
  // The reference goes to the input itself, so the form can put the focus on a field with an error.
  const { ref, ...field } = register(name);
  const error = errors[name]?.message;
  return (
    <TextField
      {...field}
      inputRef={ref}
      label={label}
      required={required}
      fullWidth
      autoComplete="off"
      error={error !== undefined}
      helperText={error ?? helper}
      slotProps={name === 'sortOrder' ? { htmlInput: { inputMode: 'numeric' } } : undefined}
    />
  );
}

/**
 * The fields that the creation and the edition of a component share (constitution VI; FR-036 to
 * FR-038): a microservice has its three routes, which the creation proposes; a frontend has its
 * health route, an optional information route and a warning, but no readiness route. The format of
 * each field is told next to it when it is not met. They know nothing about the form that holds them.
 */
export function ComponentFormFields({
  register,
  control,
  errors,
  fixed,
  onKindChange,
}: ComponentFormFieldsProps) {
  const kindLabelId = useId();
  const kind = useWatch({ control, name: 'kind' });
  const isService = kind === 'service';
  const inputs = { register, errors };

  return (
    <Stack spacing={2}>
      <TextInput {...inputs} name="name" label={text.fields.name} required />
      {fixed === undefined ? (
        <>
          <TextInput {...inputs} name="code" label={text.fields.code} required />
          <FormControl required error={errors.kind !== undefined}>
            <FormLabel id={kindLabelId}>{text.fields.kind}</FormLabel>
            <Controller
              control={control}
              name="kind"
              render={({ field: { value, onChange, ...field } }) => (
                <RadioGroup
                  {...field}
                  row
                  aria-labelledby={kindLabelId}
                  value={value}
                  onChange={(_event, next) => {
                    const chosen: RegisteredKind = next === 'frontend' ? 'frontend' : 'service';
                    onChange(chosen);
                    onKindChange?.(chosen);
                  }}
                >
                  <FormControlLabel
                    value="service"
                    control={<Radio />}
                    label={text.kinds.service}
                  />
                  <FormControlLabel
                    value="frontend"
                    control={<Radio />}
                    label={text.kinds.frontend}
                  />
                </RadioGroup>
              )}
            />
          </FormControl>
        </>
      ) : (
        <Alert severity="info" role="note">
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {`${text.fields.code}: ${fixed.code} · ${text.fields.kind}: ${text.kinds[fixed.kind]}`}
          </Typography>
          <Typography variant="body2">{text.form.fixedInfo}</Typography>
        </Alert>
      )}
      <TextInput {...inputs} name="baseUrl" label={text.fields.baseUrl} required />
      {!isService && (
        <Alert severity="warning" role="note">
          {text.form.frontendWarning}
        </Alert>
      )}
      <TextInput
        {...inputs}
        name="livePath"
        label={isService ? text.fields.livePath : text.fields.healthPath}
        required
      />
      {isService && (
        <TextInput {...inputs} name="readyPath" label={text.fields.readyPath} required />
      )}
      <TextInput
        {...inputs}
        name="infoPath"
        label={text.fields.infoPath}
        required={isService}
        helper={isService ? undefined : text.form.optional}
      />
      <Controller
        control={control}
        name="enabled"
        render={({ field: { value, onChange, ...field } }) => (
          <FormControlLabel
            control={
              <Checkbox
                {...field}
                checked={value}
                onChange={(_event, checked) => {
                  onChange(checked);
                }}
              />
            }
            label={text.fields.enabled}
          />
        )}
      />
      <TextInput
        {...inputs}
        name="sortOrder"
        label={text.fields.sortOrder}
        helper={text.form.sortOrderHelper}
      />
    </Stack>
  );
}
