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
import { SUBSCRIPTION_TYPE } from '../schemas/subscriptionTypeCatalog';
import { applyRefusal } from './applyRefusal';
import { SubscriptionFormFields } from './SubscriptionFormFields';
import { SubscriptionPreviewPanel } from './SubscriptionPreviewPanel';

const text = messages.subscriptions;

const EMPTY: SubscriptionFormValues = {
  name: '',
  description: '',
  subscriptionTypeId: SUBSCRIPTION_TYPE.INDIVIDUAL,
  clinicsLimit: '1',
  monthlyPrice: '',
  annualPrice: '',
  trialDays: '0',
  selfService: true,
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
    setValue,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: EMPTY,
  });
  // `watch()` is not memoizable by the React Compiler (it skips this component instead); that is
  // fine here, because `SubscriptionPreviewPanel` is not memoized, so there is no stale UI to risk.
  // eslint-disable-next-line react-hooks/incompatible-library
  const liveValues = watch();

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
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack sx={{ flex: 2, minWidth: 0, width: '100%' }}>
          <FormFrame
            onSubmit={(event) => {
              void save(event);
            }}
            pending={isSubmitting}
            error={generalError}
            cancelTo={`/subscriptions${listSearch ?? ''}`}
          >
            <SubscriptionFormFields
              register={register}
              control={control}
              setValue={setValue}
              errors={errors}
            />
          </FormFrame>
        </Stack>
        <Stack
          sx={{ flex: 1, minWidth: 0, width: '100%', position: { md: 'sticky' }, top: { md: 16 } }}
        >
          <SubscriptionPreviewPanel values={liveValues} />
        </Stack>
      </Stack>
    </Stack>
  );
}
