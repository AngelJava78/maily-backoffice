import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormFrame } from '@/shared/ui/FormFrame';
import { Icon } from '@/shared/ui/Icon';
import { useNotify } from '@/shared/ui/Notifications';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeSubscriptionError } from '../api/subscriptionErrors';
import { useNotifySubscriptionError } from '../hooks/useNotifySubscriptionError';
import { useSubscription } from '../hooks/useSubscription';
import { useUpdateSubscription } from '../hooks/useUpdateSubscription';
import type { Subscription } from '../schemas/subscription';
import { parseSubscriptionDetailState } from '../schemas/subscriptionDetailState';
import {
  subscriptionFormSchema,
  toFormValues,
  toUpdateSubscriptionBody,
  type SubscriptionFormValues,
} from '../schemas/subscriptionForm';
import { applyRefusal } from './applyRefusal';
import { SubscriptionFormFields } from './SubscriptionFormFields';

const text = messages.subscriptions;

/** Where the person goes after saving or cancelling: the detail, with the list it came from. */
interface BackTo {
  readonly pathname: string;
  readonly state?: { readonly listSearch: string };
}

/**
 * The form with the data of the subscription. It is built with the subscription already loaded, so
 * its initial values are the real ones; it is not reset afterwards, so what the person types is
 * never overwritten by a new load of the subscription.
 */
function EditSubscriptionForm({
  subscription,
  backTo,
}: {
  readonly subscription: Subscription;
  readonly backTo: BackTo;
}) {
  const navigate = useNavigate();
  const notify = useNotify();
  const notifyError = useNotifySubscriptionError();
  // What changed is told against the subscription as the form opened, not as a later load brings
  // it: a datum that another person changed meanwhile is not sent back with its old value.
  const [initial] = useState(subscription);
  const update = useUpdateSubscription(initial.id);
  const [generalError, setGeneralError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: toFormValues(initial),
  });

  // Replacing the entry, so that going back does not return to a form with old values.
  const goBack = () => {
    void navigate(backTo.pathname, { replace: true, state: backTo.state });
  };

  const save = handleSubmit(async (values) => {
    setGeneralError(undefined);
    // Only what changed since the form was opened is sent; with no change, nothing (clarification 9).
    const body = toUpdateSubscriptionBody(initial, values);
    if (body === null) {
      notify({ severity: 'info', message: text.edit.noChanges });
      goBack();
      return;
    }
    try {
      await update.mutateAsync(
        { body },
        {
          // Only while the form is still on screen: the person who left meanwhile is not taken back.
          onSuccess: () => {
            notify({ severity: 'success', message: text.edit.saved });
            goBack();
          },
        },
      );
    } catch (error) {
      const outcome = describeSubscriptionError(error, 'update');
      if (outcome.kind === 'notFound') {
        // It was asked for again: the page shows that it does not exist instead of this form.
        notifyError(error, 'update');
        return;
      }
      setGeneralError(applyRefusal(outcome, setError));
    }
  });

  return (
    <FormFrame
      onSubmit={(event) => {
        void save(event);
      }}
      pending={isSubmitting}
      error={generalError}
      cancelTo={backTo.pathname}
      cancelState={backTo.state}
    >
      <SubscriptionFormFields
        register={register}
        control={control}
        errors={errors}
        disableSubscriptionType
      />
    </FormFrame>
  );
}

/**
 * Changes the name, the description, the price and what a subscription includes (US3), in any
 * status that is vigente: unlike a user, a subscription that is not active can still be modified.
 * The status has its own action in the detail. If the subscription is deleted while the form is
 * open, saving tells it and the page shows that it does not exist.
 */
export function SubscriptionEditPage({ subscriptionId }: { readonly subscriptionId: number }) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { listSearch } = parseSubscriptionDetailState(useLocation().state);
  const query = useSubscription(subscriptionId);
  const backTo: BackTo = {
    pathname: `/subscriptions/${subscriptionId}`,
    ...(listSearch === undefined ? {} : { state: { listSearch } }),
  };

  function content() {
    if (query.isError && describeSubscriptionError(query.error, 'get').kind === 'notFound') {
      return (
        <ErrorState
          title={text.detail.notFound.title}
          message={text.detail.notFound.message}
          secondaryAction={
            <Button component={RouterLink} to="/subscriptions">
              {text.detail.notFound.backToList}
            </Button>
          }
        />
      );
    }
    // A failed refresh does not take the form away: what the person typed would be lost with it.
    if (query.isError && query.data === undefined) {
      return (
        <ErrorState
          title={text.detail.loadError.title}
          message={text.detail.loadError.message}
          onRetry={() => {
            void query.refetch();
          }}
          secondaryAction={
            <Button
              component={RouterLink}
              to="/subscriptions"
              startIcon={<Icon name="arrow-back" decorative />}
            >
              {text.detail.backToList}
            </Button>
          }
        />
      );
    }
    if (query.data === undefined) {
      return <CircularProgress aria-label={messages.common.loading} />;
    }
    return <EditSubscriptionForm key={query.data.id} subscription={query.data} backTo={backTo} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {text.edit.title}
      </Typography>
      {content()}
    </Stack>
  );
}
