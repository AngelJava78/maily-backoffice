import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

function NameField({
  registration,
  label,
  required,
  error,
}: {
  readonly registration: UseFormRegisterReturn;
  readonly label: string;
  readonly required: boolean;
  readonly error?: string;
}) {
  // The reference goes to the input itself, so the form can put the focus on a field with an error.
  const { ref, ...field } = registration;
  return (
    <TextField
      {...field}
      inputRef={ref}
      label={label}
      required={required}
      fullWidth
      autoComplete="off"
      error={error !== undefined}
      helperText={error}
    />
  );
}

/**
 * The name and the two last names of a user, shared by the creation and the edition of a user
 * (constitution VI: one form for both). They receive the registrations of the form and the errors,
 * so they know nothing about the form that holds them.
 */
export function UserNameFields({
  firstName,
  paternalLastName,
  maternalLastName,
  errors,
}: {
  readonly firstName: UseFormRegisterReturn;
  readonly paternalLastName: UseFormRegisterReturn;
  readonly maternalLastName: UseFormRegisterReturn;
  readonly errors: {
    readonly firstName?: string;
    readonly paternalLastName?: string;
    readonly maternalLastName?: string;
  };
}) {
  const { fields } = messages.users.form;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 2,
      }}
    >
      <NameField
        registration={firstName}
        label={fields.firstName}
        required
        error={errors.firstName}
      />
      <NameField
        registration={paternalLastName}
        label={fields.paternalLastName}
        required
        error={errors.paternalLastName}
      />
      <NameField
        registration={maternalLastName}
        label={fields.maternalLastName}
        required={false}
        error={errors.maternalLastName}
      />
    </Box>
  );
}
