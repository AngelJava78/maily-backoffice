import { zodResolver } from '@hookform/resolvers/zod';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { FormFrame } from '@/shared/ui/FormFrame';
import { useNotify } from '@/shared/ui/Notifications';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeMonitoredComponentError } from '../api/monitoredComponentErrors';
import { applyComponentRefusal } from '../components/applyComponentRefusal';
import { ComponentFormFields } from '../components/ComponentFormFields';
import { useCreateMonitoredComponent } from '../hooks/useMonitoredComponentMutations';
import {
  componentFormSchema,
  newComponentFormValues,
  toCreatePayload,
  type ComponentFormValues,
} from '../schemas/componentForm';
import type { RegisteredKind } from '../schemas/monitoredComponent';

/**
 * «Nuevo componente» (FR-036): a microservice starts with the routes of the v1 contract proposed,
 * and choosing a frontend asks for its health route instead. On success the person goes back to
 * the list, which shows it, with a notice; a refusal is told next to its field, and what was written
 * stays (FR-039). Cancelling goes back to the list without registering anything.
 */
export function MonitoredComponentCreatePage() {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const navigate = useNavigate();
  const notify = useNotify();
  const create = useCreateMonitoredComponent();
  const [generalError, setGeneralError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: newComponentFormValues('service'),
  });

  /** The routes of the kind that was chosen replace the ones on screen (FR-036). */
  function proposeRoutes(kind: RegisteredKind): void {
    const routes = newComponentFormValues(kind);
    setValue('livePath', routes.livePath);
    setValue('readyPath', routes.readyPath);
    setValue('infoPath', routes.infoPath);
  }

  const save = handleSubmit(async (values) => {
    setGeneralError(undefined);
    try {
      await create.mutateAsync(toCreatePayload(values), {
        // Only while the form is still on screen: the person who left meanwhile is not taken back.
        onSuccess: () => {
          notify({ severity: 'success', message: messages.health.registry.notices.created });
          void navigate('/health/components', { replace: true });
        },
      });
    } catch (error) {
      setGeneralError(
        applyComponentRefusal(describeMonitoredComponentError(error, 'create'), setError),
      );
    }
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.titles.healthComponentCreate}
      </Typography>
      <FormFrame
        onSubmit={(event) => {
          void save(event);
        }}
        pending={isSubmitting}
        error={generalError}
        cancelTo="/health/components"
      >
        <ComponentFormFields
          register={register}
          control={control}
          errors={errors}
          onKindChange={proposeRoutes}
        />
      </FormFrame>
    </Stack>
  );
}
