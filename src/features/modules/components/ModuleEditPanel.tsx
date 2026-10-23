import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useNotify } from '@/shared/ui/Notifications';

import { describeModuleError } from '../api/moduleErrors';
import { useChangeModuleStatus } from '../hooks/useChangeModuleStatus';
import { useUpdateModule } from '../hooks/useUpdateModule';
import { withActionChecked } from '../policy/moduleActionSelection';
import { MODULE_STATUS, MODULE_TYPE, type ModuleActionKey } from '../schemas/moduleActionCatalog';
import {
  getChangedActions,
  moduleFormSchema,
  toFormValues,
  toUpdateModuleBody,
  type ModuleFormValues,
} from '../schemas/moduleForm';
import { isProtectedModule, type SystemModule } from '../schemas/systemModule';
import type { ModuleCapabilities } from '..';
import { applyModuleRefusal } from './applyModuleRefusal';
import { ModuleFormFields } from './ModuleFormFields';

const text = messages.modules;

interface ModuleEditPanelProps {
  readonly module: SystemModule;
  readonly capabilities: ModuleCapabilities;
}

/** An uncheck waiting for its confirmation (research D9); `null` while none is pending. */
interface PendingUncheck {
  readonly action: ModuleActionKey;
}

/**
 * The edición panel of Módulos (US3, US4): Clave and Tipo as fixed information, the fields `alta`
 * and `edición` share, a confirmation before any action the module already had is taken away, and
 * (US4) Bloquear/Desbloquear — unlike eliminar (US5), these are reversible and frequent enough that
 * the spec asks for no confirmation of their own (spec.md's "Why this priority" of US5).
 */
export function ModuleEditPanel({ module, capabilities }: ModuleEditPanelProps) {
  const notify = useNotify();
  const update = useUpdateModule();
  const changeStatus = useChangeModuleStatus();
  const errorRef = useRef<HTMLDivElement>(null);
  const [generalError, setGeneralError] = useState<string>();
  const [pendingUncheck, setPendingUncheck] = useState<PendingUncheck | null>(null);
  const initialValues = toFormValues(module);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: initialValues,
  });
  // `useWatch`, not the `watch()` escape hatch `useForm()` returns: the latter cannot be memoized
  // safely (React Compiler).
  const actions = useWatch({ control, name: 'actions' });

  // Same reason as `FormFrame`: the ref is read from an effect, never from inside the submit
  // handler itself, so React (and its compiler) never sees it as a render-time read.
  useEffect(() => {
    if (generalError !== undefined) {
      errorRef.current?.focus();
    }
  }, [generalError]);

  function applyToggle(action: ModuleActionKey, checked: boolean): void {
    setValue('actions', withActionChecked(actions, action, checked), { shouldDirty: true });
  }

  function handleActionToggle(action: ModuleActionKey, checked: boolean): void {
    if (!checked && module.actions.has(action)) {
      setPendingUncheck({ action });
      return;
    }
    applyToggle(action, checked);
  }

  // Prefers what the service just confirmed over the prop (constitution IV: no optimistic update),
  // so the button flips right after a success without waiting for the catalog to be asked again.
  const statusId = changeStatus.data?.statusId ?? module.statusId;

  function toggleStatus(): void {
    const action = statusId === MODULE_STATUS.ACTIVE ? 'block' : 'unblock';
    changeStatus.mutate(
      { moduleId: module.id, action },
      {
        onSuccess: () => {
          notify({
            severity: 'success',
            message: action === 'block' ? text.notices.blocked : text.notices.unblocked,
          });
        },
        onError: (error) => {
          notify({ severity: 'error', message: describeModuleError(error, action).message });
        },
      },
    );
  }

  const save = handleSubmit(async (values) => {
    setGeneralError(undefined);
    try {
      const changedActions = getChangedActions(module.actions, values.actions);
      const outcome = await update.mutateAsync({
        module,
        changes: toUpdateModuleBody(module, values),
        changedActions,
      });
      if (outcome.kind === 'saved') {
        notify({ severity: 'success', message: text.notices.saved });
        reset(values);
      } else {
        const failedLabels = outcome.failed.map((action) => text.actions[action]).join(', ');
        notify({ severity: 'warning', message: text.notices.savedPartial(failedLabels) });
        const settledActions = new Set(values.actions);
        outcome.failed.forEach((action) => {
          if (changedActions.toAdd.includes(action)) {
            settledActions.delete(action);
          } else {
            settledActions.add(action);
          }
        });
        reset({ ...values, actions: settledActions });
      }
    } catch (error) {
      const outcome = describeModuleError(error, 'update');
      const message = applyModuleRefusal(outcome, setError);
      if (message !== undefined) {
        setGeneralError(message);
      }
    }
  });

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {text.panel.editTitle}
      </Typography>
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          void save(event);
        }}
      >
        <Stack spacing={3}>
          {generalError !== undefined && (
            <Alert ref={errorRef} tabIndex={-1} severity="error">
              {generalError}
            </Alert>
          )}

          <Stack spacing={1}>
            <Stack direction="row" useFlexGap sx={{ gap: 3, flexWrap: 'wrap' }}>
              <Stack>
                <Typography variant="caption" color="text.secondary">
                  {text.form.fields.key}
                </Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>{module.key}</Typography>
              </Stack>
              <Stack>
                <Typography variant="caption" color="text.secondary">
                  {text.form.fields.type}
                </Typography>
                <Typography>{module.typeId === MODULE_TYPE.SYSTEM ? text.type.system : text.type.clinic}</Typography>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {text.form.fields.keyAndTypeFixed}
            </Typography>
          </Stack>

          <ModuleFormFields
            register={register}
            errors={errors}
            moduleKey={module.key}
            orderHelp={text.form.fields.orderHelpEdit}
            actions={actions}
            onActionToggle={handleActionToggle}
          />

          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" loading={isSubmitting}>
              {text.form.save}
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={() => {
                reset(initialValues);
              }}
            >
              {text.form.discard}
            </Button>
          </Stack>

          {(capabilities.canBlock || capabilities.canUnblock) && (
            <Stack component="section" spacing={1} sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" component="p">
                {text.blockSection.help}
              </Typography>
              {isProtectedModule(module.key) ? (
                <Alert severity="info">{text.blockSection.protectedNotice}</Alert>
              ) : (
                <Button
                  variant="outlined"
                  color={statusId === MODULE_STATUS.ACTIVE ? 'warning' : 'success'}
                  loading={changeStatus.isPending}
                  onClick={toggleStatus}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {statusId === MODULE_STATUS.ACTIVE ? text.blockSection.block : text.blockSection.unblock}
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </Box>

      <ConfirmDialog
        open={pendingUncheck !== null}
        title={text.form.uncheckActionTitle}
        message={
          pendingUncheck === null
            ? ''
            : text.form.uncheckActionConfirm(text.actions[pendingUncheck.action], module.name)
        }
        confirmLabel={text.form.uncheckActionRemove}
        tone="danger"
        onConfirm={() => {
          if (pendingUncheck !== null) {
            applyToggle(pendingUncheck.action, false);
          }
          setPendingUncheck(null);
        }}
        onCancel={() => {
          setPendingUncheck(null);
        }}
      />
    </Paper>
  );
}
