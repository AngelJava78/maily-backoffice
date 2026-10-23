import { zodResolver } from '@hookform/resolvers/zod';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useNotify } from '@/shared/ui/Notifications';

import { describeRoleError } from '../api/roleErrors';
import { useDeleteRoleAction } from '../hooks/useDeleteRoleAction';
import { useDuplicateRoleAction } from '../hooks/useDuplicateRoleAction';
import { useEditablePermissionMatrix } from '../hooks/useEditablePermissionMatrix';
import { useRoleDetail } from '../hooks/useRoleDetail';
import { useRolePermissionMatrix } from '../hooks/useRolePermissionMatrix';
import { useRolePermissionsLocation } from '../hooks/useRolePermissionsLocation';
import { useSaveRoleDetail } from '../hooks/useSaveRoleDetail';
import type { RoleCapabilities } from '../policy/roleCapabilities';
import { countGranted, countTotal } from '../schemas/permissionMatrix';
import { nameChangesOf, roleEditInputSchema, type Role, type RoleEditInput } from '../schemas/role';
import { DeleteRoleDialog } from './DeleteRoleDialog';
import { PermissionsMatrix } from './PermissionsMatrix';
import { RoleDetailActions } from './RoleDetailActions';

const text = messages.roles.detail;

interface RoleDetailPanelProps {
  readonly roleId: number;
  readonly capabilities: RoleCapabilities;
  /** T068: lets the screen warn before an action (change tab/role, leave `/roles`) would discard these. */
  readonly onDirtyChange?: (dirty: boolean) => void;
  /** T087: "Duplicar" selects the new role; the parent decides what that means for the URL/tab. */
  readonly onDuplicated?: (role: Role) => void;
}

/**
 * Nombre, descripción, tipo y la tabla de permisos de un role (FR-005, FR-006 a FR-010, FR-021):
 * every pending change (own fields and the table alike) is saved or discarded together. The type
 * is shown as text, never a field — it cannot change once the role exists. A role that still fails
 * to load (network/5xx, not "no longer exists": `useRoleDetail` already tells those apart) is the
 * only case that takes over the whole panel; a catalog failure only takes the table (FR-020).
 */
export function RoleDetailPanel({
  roleId,
  capabilities,
  onDirtyChange,
  onDuplicated,
}: RoleDetailPanelProps) {
  const detail = useRoleDetail(roleId);
  const role = detail.data?.role;
  const matrixQuery = useRolePermissionMatrix(
    role?.type.id ?? 1,
    detail.data?.grantedPermissionIds,
  );
  const matrixEditor = useEditablePermissionMatrix(matrixQuery.matrix, roleId);
  const save = useSaveRoleDetail();
  const { setRoleId } = useRolePermissionsLocation();
  const deleteAction = useDeleteRoleAction(roleId, () => {
    setRoleId(null);
  });
  // T087: the next role loaded under this id gets the focus on its name field, once (the usual
  // role switch, read by the effect below, does not touch this ref at all).
  const justDuplicatedIdRef = useRef<number | null>(null);
  const duplicateAction = useDuplicateRoleAction(roleId, (duplicated) => {
    justDuplicatedIdRef.current = duplicated.id;
    onDuplicated?.(duplicated);
  });
  const notify = useNotify();
  const [generalError, setGeneralError] = useState<string>();
  const fieldsDisabled = save.isPending || !capabilities.canEdit;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty: isNameDirty },
  } = useForm<RoleEditInput>({
    resolver: zodResolver(roleEditInputSchema),
    defaultValues: { name: '', description: '' },
  });

  // Whenever a different role is shown, or this one's own name/description come back changed
  // (typically right after a successful save), the form restarts from what the server has — never
  // silently overwriting what the person is still typing for the role they already have open.
  useEffect(() => {
    if (role === undefined) {
      return;
    }
    reset({ name: role.name, description: role.description ?? '' });
    if (role.id === justDuplicatedIdRef.current) {
      justDuplicatedIdRef.current = null;
      // `reset()` re-registers the field on its own next tick; focusing in the same one can miss it.
      const id = setTimeout(() => {
        setFocus('name');
      }, 0);
      return () => {
        clearTimeout(id);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.id, role?.name, role?.description]);

  const isDirty = isNameDirty || matrixEditor.isDirty;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  if (detail.isLoading) {
    return <CircularProgress aria-label={messages.common.loading} />;
  }
  if (detail.isError) {
    return <ErrorState title={messages.errors.routeTitle} message={messages.errors.unexpected} />;
  }
  if (role === undefined) {
    return <Typography color="text.secondary">{messages.roles.errors.notFound}</Typography>;
  }

  const onDiscard = () => {
    reset({ name: role.name, description: role.description ?? '' });
    matrixEditor.reset();
    setGeneralError(undefined);
  };

  const onSave = handleSubmit((values) => {
    setGeneralError(undefined);
    const { toAssociate, toDisassociate } = matrixEditor.diff();
    save.mutate(
      { roleId, nameChanges: nameChangesOf(values, role), toAssociate, toDisassociate },
      {
        onSuccess: (result) => {
          matrixEditor.reset();
          if (result.failedPermissionIds.length > 0) {
            notify({
              severity: 'warning',
              message: messages.roles.errors.saveIncomplete(result.failedPermissionIds.length),
            });
          } else {
            notify({ severity: 'success', message: text.saved });
          }
        },
        onError: (error) => {
          const outcome = describeRoleError(error);
          if (outcome.kind === 'field' && outcome.fields.name !== undefined) {
            setError(
              'name',
              { type: 'server', message: outcome.fields.name },
              { shouldFocus: true },
            );
          } else {
            setGeneralError(outcome.message);
          }
        },
      },
    );
  });

  return (
    <Stack
      component="form"
      spacing={3}
      noValidate
      onSubmit={(event) => {
        void onSave(event);
      }}
    >
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          {generalError !== undefined && (
            <ErrorState title={messages.errors.routeTitle} message={generalError} />
          )}
          <TextField
            label={text.fields.name}
            helperText={errors.name?.message ?? text.nameHelper}
            error={errors.name !== undefined}
            disabled={fieldsDisabled}
            {...register('name')}
          />
          <TextField
            label={text.fields.description}
            multiline
            minRows={2}
            disabled={fieldsDisabled}
            {...register('description')}
          />
          <Typography color="text.secondary">
            {text.fields.type}: {role.type.name}
          </Typography>
          <Typography>
            {matrixEditor.matrix === undefined
              ? null
              : text.permissionsCount(
                  countGranted(matrixEditor.matrix),
                  countTotal(matrixEditor.matrix),
                )}
          </Typography>
          <RoleDetailActions
            capabilities={capabilities}
            isDirty={isDirty}
            savePending={save.isPending}
            duplicatePending={duplicateAction.pending}
            onDiscard={onDiscard}
            onDuplicate={duplicateAction.duplicate}
            onDelete={deleteAction.start}
          />
        </Stack>
      </Paper>
      <div>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          {text.matrixTitle(role.name)}
        </Typography>
        {matrixQuery.isError ? (
          <ErrorState
            title={messages.errors.routeTitle}
            message={text.matrixError}
            onRetry={matrixQuery.refetch}
          />
        ) : matrixEditor.matrix === undefined ? (
          <CircularProgress aria-label={messages.common.loading} />
        ) : (
          <PermissionsMatrix
            matrix={matrixEditor.matrix}
            pending={fieldsDisabled}
            onToggle={matrixEditor.toggle}
            onToggleAll={matrixEditor.toggleAll}
          />
        )}
      </div>
      <DeleteRoleDialog
        open={deleteAction.open}
        roleName={role.name}
        pending={deleteAction.pending}
        onConfirm={deleteAction.confirm}
        onCancel={deleteAction.cancel}
      />
    </Stack>
  );
}
