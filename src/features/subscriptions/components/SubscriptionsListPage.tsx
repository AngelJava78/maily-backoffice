import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Icon } from '@/shared/ui/Icon';
import { LiveStatus } from '@/shared/ui/LiveStatus';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useSubscriptionCatalog } from '../hooks/useSubscriptionCatalog';
import { useSubscriptionsLocation } from '../hooks/useSubscriptionsLocation';
import { pageOf } from '../policy/catalogOrder';
import type { SubscriptionCapabilities } from '../policy/subscriptionActions';
import { SubscriptionsGrid } from './SubscriptionsGrid';

const text = messages.subscriptions;

interface SubscriptionsListPageProps {
  /** What the operator may do in the section (decided in `app` with the policies of `auth`). */
  readonly capabilities: SubscriptionCapabilities;
}

/**
 * The section of subscriptions: the whole catalog in the fixed order of the list, one page at a
 * time. The API returns it without pages, so the page that the address asks for is cut from it
 * (a deviation from principle IV justified in the plan); a page past the last one is replaced by
 * the last, and the grid is never given a page that does not exist.
 */
export function SubscriptionsListPage({ capabilities }: SubscriptionsListPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location, search, setPage, setPageSize } = useSubscriptionsLocation();
  // The creation comes back to the list it came from, at the same page, when it is cancelled.
  const createAction = capabilities.canCreate ? (
    <Button
      component={RouterLink}
      to="/subscriptions/new"
      state={{ listSearch: search }}
      variant="contained"
      startIcon={<Icon name="add" decorative />}
    >
      {text.list.createAction}
    </Button>
  ) : undefined;
  const query = useSubscriptionCatalog();
  const loaded = query.data !== undefined;
  const shown = pageOf(query.data ?? [], location.page, location.pageSize);
  const pageWasClamped = loaded && shown.pageWasClamped;

  useEffect(() => {
    if (pageWasClamped) {
      setPage(shown.page, { replace: true });
    }
  }, [pageWasClamped, shown.page, setPage]);

  function content() {
    if (query.isError && !loaded) {
      return (
        <ErrorState
          title={text.list.loadError.title}
          message={text.list.loadError.message}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }
    const first = (shown.page - 1) * location.pageSize + 1;
    return (
      <>
        <SubscriptionsGrid
          subscriptions={shown.items}
          total={shown.total}
          page={shown.page}
          pageSize={location.pageSize}
          loading={!loaded}
          listSearch={search}
          emptyAction={createAction}
          onPaginationChange={(nextPage, nextPageSize) => {
            if (nextPageSize === location.pageSize) {
              setPage(nextPage, { replace: pageWasClamped });
            } else {
              setPageSize(nextPageSize);
            }
          }}
        />
        {/* Changing the page changes only the rows: a screen reader is told which ones are shown. */}
        <LiveStatus>
          {!loaded || shown.items.length === 0 || pageWasClamped
            ? ''
            : text.list.pageStatus(first, first + shown.items.length - 1, shown.total)}
        </LiveStatus>
      </>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
          {text.title}
        </Typography>
        {createAction}
      </Stack>
      {content()}
    </Stack>
  );
}
