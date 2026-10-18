import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { messages } from '@/shared/messages/es';

import { emailFieldSchema } from '../schemas/userForm';

const searchFormSchema = z.object({ email: emailFieldSchema });

interface UserSearchFormProps {
  /** The email that is being searched, if any. It is shown, and then the search can be cleared. */
  readonly initialEmail?: string;
  readonly onSearch: (email: string) => void;
  readonly onClear: () => void;
}

/**
 * The search by complete email, the only way to reach a blocked or a deleted user. The email is
 * validated before anything is asked (FR-018); a mistake is shown next to the field and the focus
 * goes to it. The form stays in the page while the address changes, so the focus is not lost; its
 * field follows the address through `values`, and clearing the search puts the focus back on it,
 * because the button that cleared it goes away.
 */
export function UserSearchForm({ initialEmail, onSearch, onClear }: UserSearchFormProps) {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(searchFormSchema),
    values: { email: initialEmail ?? '' },
  });
  const { ref, ...emailField } = register('email');

  return (
    <form
      role="search"
      noValidate
      onSubmit={(event) => {
        void handleSubmit((values) => {
          onSearch(values.email);
        })(event);
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start' }}>
        <TextField
          {...emailField}
          inputRef={ref}
          label={messages.users.search.label}
          // A text input with the keyboard of emails: the browser does not clean what is typed in it,
          // so the validation of the form is what the person sees.
          slotProps={{ htmlInput: { inputMode: 'email', spellCheck: false } }}
          autoComplete="off"
          size="small"
          sx={{ flex: 1, width: { xs: '100%', sm: 'auto' }, maxWidth: { sm: 480 } }}
          error={errors.email !== undefined}
          helperText={errors.email?.message ?? messages.users.search.helper}
        />
        <Button type="submit" variant="contained">
          {messages.users.search.submit}
        </Button>
        {initialEmail !== undefined && (
          <Button
            type="button"
            onClick={() => {
              onClear();
              setFocus('email');
            }}
          >
            {messages.users.search.clear}
          </Button>
        )}
      </Stack>
    </form>
  );
}
