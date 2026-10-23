import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

import { describeModuleError } from '../api/moduleErrors';
import { useCreateModule } from '../hooks/useCreateModule';
import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import {
  initialModuleFormValues,
  moduleFormSchema,
  toCreateModuleBody,
  type ModuleFormValues,
} from '../schemas/moduleForm';
import { withActionChecked } from '../policy/moduleActionSelection';
import { applyModuleRefusal } from './applyModuleRefusal';
import { ModuleFormFields } from './ModuleFormFields';

const text = messages.modules;

interface ModuleCreatePanelProps {
  /** What "Si lo dejas vacío, queda al final" resolves to right now (research D13). */
  readonly nextSortOrder: number;
  /** The module was created (even if partially, research D11): the caller opens it for editing. */
  readonly onCreated: (moduleId: number) => void;
  readonly onCancel: () => void;
}

/** The alta panel of Módulos (US2): Tipo and Clave, only editable here, plus the fields alta and
 * edición share. */
export function ModuleCreatePanel({ nextSortOrder, onCreated, onCancel }: ModuleCreatePanelProps) {
  const notify = useNotify();
  const create = useCreateModule();
  const errorRef = useRef<HTMLDivElement>(null);
  const [generalError, setGeneralError] = useState<string>();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: initialModuleFormValues,
  });
  // `useWatch`, not the `watch()` escape hatch `useForm()` returns: the latter cannot be memoized
  // safely (React Compiler).
  const type = useWatch({ control, name: 'type' });
  const key = useWatch({ control, name: 'key' });
  const actions = useWatch({ control, name: 'actions' });

  // Same reason as `FormFrame`: the ref is read from an effect, never from inside the submit
  // handler itself, so React (and its compiler) never sees it as a render-time read.
  useEffect(() => {
    if (generalError !== undefined) {
      errorRef.current?.focus();
    }
  }, [generalError]);

  const save = handleSubmit(async (values) => {
    setGeneralError(undefined);
    try {
      const outcome = await create.mutateAsync({
        body: toCreateModuleBody(values),
        actions: [...values.actions],
      });
      if (outcome.kind === 'created') {
        notify({ severity: 'success', message: text.notices.created });
      } else {
        const failedLabels = outcome.failed
          .map((failure) => text.actions[failure.action])
          .join(', ');
        notify({ severity: 'warning', message: text.notices.createdPartial(failedLabels) });
      }
      onCreated(outcome.module.id);
    } catch (error) {
      const outcome = describeModuleError(error, 'create');
      const message = applyModuleRefusal(outcome, setError);
      if (message !== undefined) {
        setGeneralError(message);
      }
    }
  });

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {text.panel.createTitle}
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
            <FormLabel component="legend">{text.form.fields.type}</FormLabel>
            <RadioGroup
              row
              value={String(type)}
              onChange={(event) => {
                const next =
                  event.target.value === String(MODULE_TYPE.CLINIC)
                    ? MODULE_TYPE.CLINIC
                    : MODULE_TYPE.SYSTEM;
                setValue('type', next, { shouldDirty: true });
              }}
            >
              <Stack direction="row" useFlexGap sx={{ gap: 2, flexWrap: 'wrap' }}>
                {([MODULE_TYPE.SYSTEM, MODULE_TYPE.CLINIC] as const).map((typeId) => (
                  <Paper key={typeId} variant="outlined" sx={{ p: 2, flex: '1 1 160px' }}>
                    <FormControlLabel
                      value={String(typeId)}
                      control={<Radio />}
                      label={
                        <Stack>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {typeId === MODULE_TYPE.SYSTEM ? text.type.system : text.type.clinic}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {typeId === MODULE_TYPE.SYSTEM
                              ? text.typeHelp.system
                              : text.typeHelp.clinic}
                          </Typography>
                        </Stack>
                      }
                    />
                  </Paper>
                ))}
              </Stack>
            </RadioGroup>
            <Typography variant="caption" color="text.secondary">
              {text.form.fields.typeImmutable}
            </Typography>
          </Stack>

          <TextField
            {...register('key')}
            label={text.form.fields.key}
            required
            fullWidth
            autoComplete="off"
            error={errors.key !== undefined}
            helperText={errors.key?.message ?? text.form.fields.keyHelp}
          />

          <ModuleFormFields
            register={register}
            errors={errors}
            moduleKey={key}
            orderHelp={text.form.fields.orderHelp(nextSortOrder)}
            actions={actions}
            onActionToggle={(action, checked) => {
              setValue('actions', withActionChecked(actions, action, checked), {
                shouldDirty: true,
              });
            }}
          />

          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" loading={isSubmitting}>
              {text.form.create}
            </Button>
            <Button onClick={onCancel} disabled={isSubmitting}>
              {text.form.cancel}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}
