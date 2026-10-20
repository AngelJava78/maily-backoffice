import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { RefreshFailedAlert } from '@/shared/ui/RefreshFailedAlert';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeSubscriptionError } from '../api/subscriptionErrors';
import { useSubscription } from '../hooks/useSubscription';
import type { SubscriptionCapabilities } from '../policy/subscriptionActions';
import { parseSubscriptionDetailState } from '../schemas/subscriptionDetailState';
import { DeleteSubscriptionAction } from './DeleteSubscriptionAction';
import { SubscriptionDetailFields } from './SubscriptionDetailFields';
import { SubscriptionStatusMenu } from './SubscriptionStatusMenu';

const text = messages.subscriptions.detail;

interface SubscriptionDetailPageProps {
  readonly subscriptionId: number;
  /** What the operator may do with the subscription (decided in `app` with the policies of `auth`). */
  readonly capabilities: SubscriptionCapabilities;
}

/**
 * The detail of a subscription of any status: every datum, and the actions the operator is allowed
 * to do, only here (decision 3 of the spec). The title is on screen from the first render, while the
 * data load, so the focus can go to it.
 */
export function SubscriptionDetailPage({
  subscriptionId,
  capabilities,
}: SubscriptionDetailPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const location = useLocation();
  const { listSearch } = parseSubscriptionDetailState(location.state);
  const query = useSubscription(subscriptionId);

  /**
   * The way back, with the actions beside it once the subscription is known. It is the first child
   * of every state of the page, so it keeps the same element while the subscription loads: a link
   * that was found while loading can still be clicked when the data arrive.
   */
  function toolbar(actions?: ReactNode) {
    return (
      <Stack
        direction="row"
        useFlexGap
        sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button
          component={RouterLink}
          to={`/subscriptions${listSearch ?? ''}`}
          startIcon={<ArrowBackIcon />}
        >
          {text.backToList}
        </Button>
        {actions}
      </Stack>
    );
  }

  function content() {
    if (query.isError && describeSubscriptionError(query.error, 'get').kind === 'notFound') {
      return (
        <ErrorState
          title={text.notFound.title}
          message={text.notFound.message}
          secondaryAction={
            <Button component={RouterLink} to="/subscriptions">
              {text.notFound.backToList}
            </Button>
          }
        />
      );
    }
    // A failed refresh does not take away what is already on screen: the data is shown, with a notice.
    if (query.isError && query.data === undefined) {
      return (
        <>
          {toolbar()}
          <ErrorState
            title={text.loadError.title}
            message={text.loadError.message}
            onRetry={() => {
              void query.refetch();
            }}
          />
        </>
      );
    }
    if (query.data === undefined) {
      return (
        <>
          {toolbar()}
          <CircularProgress aria-label={messages.common.loading} />
        </>
      );
    }
    const subscription = query.data;

    return (
      <>
        {toolbar(
          <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
            {capabilities.canEdit && (
              <Button
                component={RouterLink}
                to={`/subscriptions/${subscription.id}/edit`}
                state={listSearch === undefined ? undefined : { listSearch }}
                variant="contained"
                startIcon={<EditIcon />}
              >
                {messages.subscriptions.actions.edit}
              </Button>
            )}
            {capabilities.canChangeStatus && <SubscriptionStatusMenu subscription={subscription} />}
            {capabilities.canDelete && <DeleteSubscriptionAction subscription={subscription} />}
          </Stack>,
        )}
        {query.isError && (
          <RefreshFailedAlert
            message={text.refreshError}
            onRetry={() => {
              void query.refetch();
            }}
          />
        )}
        <SubscriptionDetailFields subscription={subscription} />
      </>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {text.title}
      </Typography>
      {content()}
    </Stack>
  );
}
