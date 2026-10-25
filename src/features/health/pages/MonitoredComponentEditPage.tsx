import { zodResolver } from '@hookform/resolvers/zod';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormFrame } from '@/shared/ui/FormFrame';
import { useNotify } from '@/shared/ui/Notifications';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeMonitoredComponentError } from '../api/monitoredComponentErrors';
import { applyComponentRefusal } from '../components/applyComponentRefusal';
import { ComponentFormFields } from '../components/ComponentFormFields';
import { ComponentGone } from '../components/ComponentGone';
import { useUpdateMonitoredComponent } from '../hooks/useMonitoredComponentMutations';
import { useMonitoredComponent } from '../hooks/useMonitoredComponents';
import {
  componentFormSchema,
  toFormValues,
  toUpdatePayload,
  type ComponentFormValues,
} from '../schemas/componentForm';
import type { MonitoredComponent } from '../schemas/monitoredComponent';

const text = messages.health.registry;

/**
 * The form with the data of the component, built once it is loaded, so its initial values are the
 * real ones; it is not reset afterwards, so what the person types is never overwritten.
 */
function EditComponentForm({ component }: { readonly component: MonitoredComponent }) {
  const navigate = useNavigate();
  const notify = useNotify();
  // What changed is told against the component as the form opened (research D15).
  const [initial] = useState(component);
  const update = useUpdateMonitoredComponent(initial.id);
  const [generalError, setGeneralError] = useState<string>();
  const detail = `/health/components/${initial.id}`;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: toFormValues(initial),
  });

  const save = handleSubmit(async (values) => {
    setGeneralError(undefined);
    // Only what changed is sent; with no change, nothing: an empty modification is a 422.
    const payload = toUpdatePayload(initial, values);
    if (payload === null) {
      void navigate(detail, { replace: true });
      return;
    }
    try {
      await update.mutateAsync(payload, {
        onSuccess: () => {
          notify({ severity: 'success', message: text.notices.updated });
          void navigate(detail, { replace: true });
        },
      });
    } catch (error) {
      const outcome = describeMonitoredComponentError(error, 'update');
      if (outcome.kind === 'notFound') {
        notify({ severity: 'warning', message: outcome.message });
        void navigate('/health/components', { replace: true });
        return;
      }
      setGeneralError(applyComponentRefusal(outcome, setError));
    }
  });

  return (
    <FormFrame
      onSubmit={(event) => {
        void save(event);
      }}
      pending={isSubmitting}
      error={generalError}
      cancelTo={detail}
    >
      <ComponentFormFields
        register={register}
        control={control}
        errors={errors}
        fixed={{ code: initial.code, kind: initial.kind }}
      />
    </FormFrame>
  );
}

/**
 * «Editar componente» (FR-037): the same form as the creation, with the code and the kind as fixed
 * information, and the states of the detail while its data load.
 */
export function MonitoredComponentEditPage({ componentId }: { readonly componentId: string }) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const query = useMonitoredComponent(componentId);

  function content() {
    const outcome = query.isError ? describeMonitoredComponentError(query.error, 'get') : null;
    if (outcome?.kind === 'notFound') {
      return <ComponentGone componentId={componentId} />;
    }
    if (query.data !== undefined) {
      return <EditComponentForm component={query.data} />;
    }
    if (outcome !== null) {
      return (
        <ErrorState
          title={text.errors.loadError.detailTitle}
          message={text.errors.loadError.message}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }
    return <CircularProgress aria-label={messages.common.loading} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.titles.healthComponentEdit}
      </Typography>
      {content()}
    </Stack>
  );
}
