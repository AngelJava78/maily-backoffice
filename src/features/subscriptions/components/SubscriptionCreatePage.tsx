import { zodResolver } from '@hookform/resolvers/zod';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { FormFrame } from '@/shared/ui/FormFrame';
import { useNotify } from '@/shared/ui/Notifications';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeSubscriptionError } from '../api/subscriptionErrors';
import { useCreateSubscription } from '../hooks/useCreateSubscription';
import { REQUIRED_MODULE_KEY } from '../schemas/clinicModuleCatalog';
import { parseSubscriptionDetailState } from '../schemas/subscriptionDetailState';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { applyRefusal } from './applyRefusal';
import { SubscriptionFormFields } from './SubscriptionFormFields';

const text = messages.subscriptions;

const EMPTY: SubscriptionFormValues = {
  name: '',
  description: '',
  monthlyPrice: '',
  annualPrice: '',
  trialDays: '0',
  selfService: false,
  moduleKeys: new Set([REQUIRED_MODULE_KEY]),
  consultingRoomsLimit: '',
  doctorsLimit: '',
  assistantsLimit: '',
  newPatientsPerYearLimit: '',
  otherFeatures: [],
};

/**
 * Creates a subscription (US2): it is born active, so the form asks for no status. On success the
 * operator lands on its detail, which replaces the form in the history, with a notice; cancelling
 * goes back to the list without creating anything.
 */
export function SubscriptionCreatePage() {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const navigate = useNavigate();
  const notify = useNotify();
  const { listSearch } = parseSubscriptionDetailState(useLocation().state);
  const create = useCreateSubscription();
  const [generalError, setGeneralError] = useState<string>();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: EMPTY,
  });

  const save = handleSubmit(async (values) => {
    setGeneralError(undefined);
    try {
      await create.mutateAsync(
        { values },
        {
          // Only while the form is still on screen: the person who left meanwhile is not taken to
          // the new subscription.
          onSuccess: (created) => {
            notify({ severity: 'success', message: text.notices.created });
            void navigate(`/subscriptions/${created.id}`, {
              replace: true,
              state: listSearch === undefined ? undefined : { listSearch },
            });
          },
        },
      );
    } catch (error) {
      setGeneralError(applyRefusal(describeSubscriptionError(error, 'create'), setError));
    }
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {text.form.createTitle}
      </Typography>
      <FormFrame
        onSubmit={(event) => {
          void save(event);
        }}
        pending={isSubmitting}
        error={generalError}
        cancelTo={`/subscriptions${listSearch ?? ''}`}
      >
        <SubscriptionFormFields register={register} control={control} errors={errors} />
      </FormFrame>
    </Stack>
  );
}
