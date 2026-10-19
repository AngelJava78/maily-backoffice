import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeUserError, type UserFormField } from '../api/userErrors';
import { useCreateUser } from '../hooks/useCreateUser';
import { useRolesCatalog } from '../hooks/useRolesCatalog';
import { parseUserDetailState } from '../schemas/userDetailState';
import { createUserFormSchema, type CreateUserFormValues } from '../schemas/userForm';
import { PasswordField } from './PasswordField';
import { RolesField } from './RolesField';
import { UserForm } from './UserForm';
import { UserNameFields } from './UserNameFields';

/** The inputs a refusal of the service can name, in the order in which they appear on screen. */
const FORM_FIELDS: readonly UserFormField[] = [
  'email',
  'password',
  'firstName',
  'paternalLastName',
  'maternalLastName',
];

/**
 * Creates a user with its initial password and at least one role (FR-005). The service creates the
 * access account of the person in the same operation; the roles are assigned right after, one by
 * one, and if some fail the user is kept and the detail offers to retry them (FR-023).
 */
export function UserCreatePage() {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const navigate = useNavigate();
  const notify = useNotify();
  const { listSearch } = parseUserDetailState(useLocation().state);
  const catalog = useRolesCatalog({ enabled: true });
  const create = useCreateUser();
  const [generalError, setGeneralError] = useState<string>();
  const [repeatedEmail, setRepeatedEmail] = useState<string>();

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      paternalLastName: '',
      maternalLastName: '',
      roleIds: [],
    },
  });
  const emailRegistration = register('email');

  const catalogIsUsable = catalog.data !== undefined && catalog.data.length > 0;

  const save = handleSubmit(async (values) => {
    setGeneralError(undefined);
    setRepeatedEmail(undefined);
    const roles = (catalog.data ?? []).filter((role) => values.roleIds.includes(role.id));
    // The catalog is asked for again from time to time, and a role that was chosen can be gone from
    // it by then: its chip is gone, but its id is still in the form, and the user would be created
    // without it (or without any role). The chosen roles are what is left, and the person is told.
    if (roles.length !== values.roleIds.length) {
      setValue(
        'roleIds',
        roles.map((role) => role.id),
      );
      setError(
        'roleIds',
        { type: 'validate', message: messages.users.validation.rolesNoLongerAvailable },
        { shouldFocus: true },
      );
      return;
    }
    try {
      const outcome = await create.mutateAsync(
        { values, roles },
        {
          // Only while the form is still on screen: the person who left meanwhile is not taken to
          // the new user.
          onSuccess: (created) => {
            void navigate(`/users/${created.user.id}`, {
              state: {
                ...(listSearch === undefined ? {} : { listSearch }),
                ...(created.kind === 'partial'
                  ? {
                      rolesNotAssigned: created.failed.map(({ role }) => ({
                        id: role.id,
                        name: role.name,
                      })),
                    }
                  : {}),
              },
            });
          },
        },
      );
      notify({
        severity: outcome.kind === 'created' ? 'success' : 'warning',
        message:
          outcome.kind === 'created'
            ? messages.users.notices.created
            : messages.users.notices.createdPartial,
      });
    } catch (error) {
      const outcome = describeUserError(error, 'create');
      if (outcome.kind === 'field') {
        FORM_FIELDS.filter((field) => outcome.fields[field] !== undefined).forEach(
          (field, index) => {
            setError(
              field,
              { type: 'server', message: outcome.fields[field] },
              { shouldFocus: index === 0 },
            );
          },
        );
        if (outcome.hint === 'searchEmail') {
          setRepeatedEmail(values.email);
        }
      } else if (outcome.kind !== 'forbidden') {
        // A lack of permission was already told by the notice of the application.
        setGeneralError(outcome.message);
      }
    } finally {
      // The mutation holds the password in its variables: let it go as soon as it is done.
      create.reset();
    }
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.users.form.createTitle}
      </Typography>
      <UserForm
        onSubmit={(event) => {
          void save(event);
        }}
        pending={isSubmitting}
        saveDisabled={!catalogIsUsable}
        error={generalError}
        cancelTo={`/users${listSearch ?? ''}`}
      >
        <Stack spacing={1}>
          <TextField
            {...emailRegistration}
            inputRef={emailRegistration.ref}
            label={messages.users.form.fields.email}
            required
            fullWidth
            autoComplete="off"
            slotProps={{ htmlInput: { inputMode: 'email', spellCheck: false } }}
            error={errors.email !== undefined}
            helperText={errors.email?.message ?? messages.users.form.emailNote}
          />
          {repeatedEmail !== undefined && (
            <Alert severity="info">
              {messages.users.errors.emailAlreadyRegisteredHint}{' '}
              <Link component={RouterLink} to={`/users?email=${encodeURIComponent(repeatedEmail)}`}>
                {messages.users.errors.searchThisEmail}
              </Link>
            </Alert>
          )}
        </Stack>
        <PasswordField registration={register('password')} error={errors.password?.message} />
        <UserNameFields
          firstName={register('firstName')}
          paternalLastName={register('paternalLastName')}
          maternalLastName={register('maternalLastName')}
          errors={{
            firstName: errors.firstName?.message,
            paternalLastName: errors.paternalLastName?.message,
            maternalLastName: errors.maternalLastName?.message,
          }}
        />
        <Controller
          name="roleIds"
          control={control}
          render={({ field, fieldState }) => (
            <RolesField
              roles={catalog.data ?? []}
              loading={catalog.isPending}
              // A failed refresh keeps the roles that were already offered.
              loadFailed={catalog.isError && catalog.data === undefined}
              onRetry={() => {
                void catalog.refetch();
              }}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
      </UserForm>
    </Stack>
  );
}
