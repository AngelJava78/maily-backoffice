import { zodResolver } from '@hookform/resolvers/zod';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useNotify } from '@/shared/ui/Notifications';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeUserError } from '../api/userErrors';
import { useNotifyUserError } from '../hooks/useNotifyUserError';
import { useUpdateUser } from '../hooks/useUpdateUser';
import { useUser } from '../hooks/useUser';
import type { PlatformUser } from '../schemas/user';
import { parseUserDetailState } from '../schemas/userDetailState';
import { editUserFormSchema, type EditUserFormValues } from '../schemas/userForm';
import { isActiveStatus } from '../schemas/userStatus';
import { UserForm } from './UserForm';
import { UserNameFields } from './UserNameFields';

/** The inputs a refusal of the service can name, in the order in which they appear on screen. */
const FORM_FIELDS: readonly (keyof EditUserFormValues)[] = [
  'firstName',
  'paternalLastName',
  'maternalLastName',
];

/** Where the person goes after saving or cancelling: the detail, with the list it came from. */
interface BackTo {
  readonly pathname: string;
  readonly state?: { readonly listSearch: string };
}

/** The email is shown, but it is not a field: the service does not carry its change to the access account. */
function EmailReadOnly({ email }: { readonly email: string }) {
  return (
    <Box component="dl" sx={{ m: 0 }}>
      <Typography component="dt" sx={{ fontWeight: 'bold' }}>
        {messages.users.form.fields.email}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {email}
      </Typography>
      <Typography component="dd" variant="body2" sx={{ m: 0, color: 'text.secondary' }}>
        {messages.users.edit.emailReadOnlyNote}
      </Typography>
    </Box>
  );
}

/**
 * The form with the data of an active user. It is built with the user already loaded, so its
 * initial values are the real ones; it is not reset afterwards, so what the person types is never
 * overwritten by a new load of the user.
 */
function EditUserForm({
  user,
  backTo,
  onSaved,
}: {
  readonly user: PlatformUser;
  readonly backTo: BackTo;
  readonly onSaved?: (user: PlatformUser) => void;
}) {
  const navigate = useNavigate();
  const notify = useNotify();
  const notifyError = useNotifyUserError();
  const update = useUpdateUser(user.id);
  const [generalError, setGeneralError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      firstName: user.firstName,
      paternalLastName: user.paternalLastName,
      maternalLastName: user.maternalLastName ?? '',
    },
  });

  const save = handleSubmit(async (values) => {
    setGeneralError(undefined);
    try {
      await update.mutateAsync(
        { values },
        {
          // Only while the form is still on screen: the person who left meanwhile is not taken back.
          onSuccess: (saved) => {
            onSaved?.(saved);
            // Replacing the entry, so that going back does not return to a form with old values.
            void navigate(backTo.pathname, { replace: true, state: backTo.state });
          },
        },
      );
      notify({ severity: 'success', message: messages.users.edit.saved });
    } catch (error) {
      const outcome = describeUserError(error, 'update');
      if (outcome.kind === 'field') {
        const named = FORM_FIELDS.filter((field) => outcome.fields[field] !== undefined);
        if (named.length === 0) {
          setGeneralError(outcome.message);
        }
        named.forEach((field, index) => {
          setError(
            field,
            { type: 'server', message: outcome.fields[field] },
            { shouldFocus: index === 0 },
          );
        });
      } else if (outcome.kind === 'statusChanged' || outcome.kind === 'notFound') {
        // The user was asked for again: the page shows what it is now instead of this form.
        notifyError(error, 'update');
      } else if (outcome.kind !== 'forbidden') {
        // A lack of permission was already told by the notice of the application.
        setGeneralError(outcome.message);
      }
    }
  });

  return (
    <UserForm
      onSubmit={(event) => {
        void save(event);
      }}
      pending={isSubmitting}
      error={generalError}
      cancelTo={backTo.pathname}
      cancelState={backTo.state}
    >
      <EmailReadOnly email={user.email} />
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
    </UserForm>
  );
}

/**
 * Changes the name and the last names of an active user (FR-013). A user that is not active cannot
 * be modified, so the page says so, with a way back, and shows no form. If the user changes status
 * while the form is open, saving tells it and the page shows that.
 */
export function UserEditPage({
  userId,
  onSaved,
}: {
  readonly userId: string;
  /** Called with the user once it was saved, while the form is still on screen. */
  readonly onSaved?: (user: PlatformUser) => void;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { listSearch } = parseUserDetailState(useLocation().state);
  const query = useUser(userId);
  const backTo: BackTo = {
    pathname: `/users/${userId}`,
    ...(listSearch === undefined ? {} : { state: { listSearch } }),
  };

  function content() {
    if (query.isError && describeUserError(query.error, 'get').kind === 'notFound') {
      return (
        <ErrorState
          title={messages.users.detail.notFound.title}
          message={messages.users.detail.notFound.message}
          secondaryAction={
            <Button component={RouterLink} to="/users">
              {messages.users.detail.notFound.backToList}
            </Button>
          }
        />
      );
    }
    // A failed refresh does not take the form away: what the person typed would be lost with it.
    if (query.isError && query.data === undefined) {
      return (
        <ErrorState
          title={messages.users.detail.loadError.title}
          message={messages.users.detail.loadError.message}
          onRetry={() => {
            void query.refetch();
          }}
          secondaryAction={
            <Button component={RouterLink} to="/users" startIcon={<ArrowBackIcon />}>
              {messages.users.detail.backToList}
            </Button>
          }
        />
      );
    }
    if (query.data === undefined) {
      return <CircularProgress aria-label={messages.common.loading} />;
    }
    if (!isActiveStatus(query.data.status.id)) {
      return (
        <Alert severity="info">
          <AlertTitle>{messages.users.edit.inactive.title}</AlertTitle>
          {messages.users.edit.inactive.message}
          <Stack direction="row" useFlexGap sx={{ mt: 2, gap: 1, flexWrap: 'wrap' }}>
            <Button component={RouterLink} to={backTo.pathname} state={backTo.state}>
              {messages.users.edit.inactive.backToDetail}
            </Button>
            <Button component={RouterLink} to={`/users${listSearch ?? ''}`}>
              {messages.users.edit.inactive.backToList}
            </Button>
          </Stack>
        </Alert>
      );
    }
    return <EditUserForm key={query.data.id} user={query.data} backTo={backTo} onSaved={onSaved} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.users.edit.title}
      </Typography>
      {content()}
    </Stack>
  );
}
