import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

/**
 * The initial password of the user. It is hidden by default and can be shown to check what was
 * typed; the browser is told it is a new password, so it neither fills it in with the one of the
 * operator nor offers to save it. There is no confirmation field: seeing it replaces it with less
 * friction (research D9). The policy of the passwords belongs to Auth0, so the form only asks for one.
 */
export function PasswordField({
  registration,
  error,
}: {
  readonly registration: UseFormRegisterReturn;
  readonly error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const { ref, ...field } = registration;

  return (
    <TextField
      {...field}
      inputRef={ref}
      label={messages.users.form.fields.password}
      type={visible ? 'text' : 'password'}
      autoComplete="new-password"
      required
      fullWidth
      error={error !== undefined}
      helperText={error ?? messages.users.form.passwordHelper}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={
                  visible ? messages.users.form.hidePassword : messages.users.form.showPassword
                }
                onClick={() => {
                  setVisible((current) => !current);
                }}
              >
                {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
