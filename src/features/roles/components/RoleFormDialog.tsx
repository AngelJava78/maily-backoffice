import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect, useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useNotify } from '@/shared/ui/Notifications';

import { describeRoleError } from '../api/roleErrors';
import { useCreateRole } from '../hooks/useCreateRole';
import { useRoleTypes } from '../hooks/useRoleTypes';
import { useRolesCatalog } from '../hooks/useRolesCatalog';
import { roleFormSchema, toCreateRoleVariables, type RoleFormValues } from '../schemas/roleForm';
import type { Role } from '../schemas/role';
import { CopyPermissionsFromField } from './CopyPermissionsFromField';

const text = messages.roles;

const DEFAULT_VALUES: RoleFormValues = {
  name: '',
  description: '',
  typeId: null,
  copyPermissionsFromRoleId: null,
};

interface RoleFormBodyProps {
  readonly titleId: string;
  readonly onCreated: (role: Role) => void;
  readonly onCancel: () => void;
  /** So the dialog shell can keep Escape/backdrop from closing it while this is true. */
  readonly onPendingChange: (pending: boolean) => void;
}

/**
 * The content of the dialog. It owns the form and the creation itself (FR-011, FR-012, research
 * D7), so it lives only while the dialog does: each opening starts blank, and a name rejected by
 * the service keeps everything the person typed, instead of losing it to a toast that closed the
 * dialog from under them.
 */
function RoleFormBody({ titleId, onCreated, onCancel, onPendingChange }: RoleFormBodyProps) {
  const rolesQuery = useRolesCatalog();
  const typesQuery = useRoleTypes();
  const create = useCreateRole();
  const notify = useNotify();

  useEffect(() => {
    onPendingChange(create.isPending);
  }, [create.isPending, onPendingChange]);
  const [generalError, setGeneralError] = useState<string>();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const typeId = useWatch({ control, name: 'typeId' });

  const onSubmit = handleSubmit((values) => {
    const variables = toCreateRoleVariables(values);
    if (variables === null) {
      return;
    }
    setGeneralError(undefined);
    create.mutate(variables, {
      onSuccess: (result) => {
        if (result.failedPermissionIds.length > 0) {
          notify({
            severity: 'warning',
            message: messages.roles.errors.saveIncomplete(result.failedPermissionIds.length),
          });
        }
        onCreated(result.role);
      },
      onError: (error) => {
        const outcome = describeRoleError(error);
        if (outcome.kind === 'field' && outcome.fields.name !== undefined) {
          setError('name', { type: 'server', message: outcome.fields.name }, { shouldFocus: true });
        } else {
          setGeneralError(outcome.message);
        }
      },
    });
  });

  return (
    <>
      <DialogTitle id={titleId}>{text.form.createTitle}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          spacing={2}
          noValidate
          onSubmit={(event) => {
            void onSubmit(event);
          }}
          sx={{ pt: 1 }}
        >
          {generalError !== undefined && (
            <ErrorState title={messages.errors.routeTitle} message={generalError} />
          )}
          <TextField
            label={text.detail.fields.name}
            helperText={errors.name?.message ?? text.detail.nameHelper}
            error={errors.name !== undefined}
            disabled={create.isPending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            {...register('name')}
          />
          <TextField
            label={text.detail.fields.description}
            disabled={create.isPending}
            {...register('description')}
          />
          <Controller
            name="typeId"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label={text.detail.fields.type}
                helperText={errors.typeId?.message ?? text.form.typeHelper}
                error={errors.typeId !== undefined}
                disabled={create.isPending}
                value={field.value ?? ''}
                onChange={(event) => {
                  const nextTypeId = Number(event.target.value) === 1 ? 1 : 2;
                  field.onChange(nextTypeId);
                  // FR-006: a role of the type being left behind is no longer a valid choice here.
                  setValue('copyPermissionsFromRoleId', null);
                }}
                onBlur={field.onBlur}
              >
                {(typesQuery.data ?? []).map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="copyPermissionsFromRoleId"
            control={control}
            render={({ field }) =>
              typeId === null ? (
                <CopyPermissionsFromField
                  typeId={1}
                  roles={[]}
                  value={null}
                  onChange={field.onChange}
                />
              ) : (
                <CopyPermissionsFromField
                  typeId={typeId}
                  roles={rolesQuery.data ?? []}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              )
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onCancel} disabled={create.isPending}>
          {text.form.cancel}
        </Button>
        <Button
          variant="contained"
          disabled={create.isPending}
          loading={create.isPending}
          loadingPosition="start"
          onClick={() => {
            void onSubmit();
          }}
        >
          {text.form.create}
        </Button>
      </DialogActions>
    </>
  );
}

interface RoleFormDialogProps {
  readonly open: boolean;
  /** Called once the role is actually created (never while copying permissions is still failing
   * outright — a partial copy still counts, FR-019). */
  readonly onCreated: (role: Role) => void;
  readonly onCancel: () => void;
  /** Called once the dialog has finished closing, which is when a notice can be announced. */
  readonly onExited?: () => void;
}

/**
 * "Nuevo role" (Historia 2): name, optional description, a type that cannot change afterwards, and
 * an optional "Copiar permisos de" limited to roles of that same type.
 */
export function RoleFormDialog({ open, onCreated, onCancel, onExited }: RoleFormDialogProps) {
  const titleId = useId();
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
      slotProps={{ transition: { onExited } }}
      onClose={() => {
        if (!pending) {
          onCancel();
        }
      }}
    >
      <RoleFormBody
        titleId={titleId}
        onCreated={onCreated}
        onCancel={onCancel}
        onPendingChange={setPending}
      />
    </Dialog>
  );
}
