import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { pageOf } from '@/shared/lib/pageOf';
import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { LiveStatus } from '@/shared/ui/LiveStatus';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { useSubscriptionCatalog } from '../hooks/useSubscriptionCatalog';
import { useSubscriptionsLocation } from '../hooks/useSubscriptionsLocation';
import type { SubscriptionCapabilities } from '../policy/subscriptionActions';
import type { SubscriptionsTab } from '../schemas/subscriptionsLocation';
import { PriceCycleToggle, type PriceCycle } from './PriceCycleToggle';
import { SubscriptionsComparisonTable } from './SubscriptionsComparisonTable';
import { SubscriptionsGrid } from './SubscriptionsGrid';

const text = messages.subscriptions;

interface SubscriptionsListPageProps {
  /** What the operator may do in the section (decided in `app` with the policies of `auth`). */
  readonly capabilities: SubscriptionCapabilities;
}

/**
 * The section of subscriptions: the Listado tab (the whole catalog in the fixed order, one page at
 * a time) and the Comparativo tab (every vigente subscription side by side). Both read the same
 * catalog query, obtained once here, so switching tabs or the price cycle never asks the API again
 * (FR-019, SC-005, research D6).
 */
export function SubscriptionsListPage({ capabilities }: SubscriptionsListPageProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location, search, setPage, setPageSize, setTab } = useSubscriptionsLocation();
  const [cycle, setCycle] = useState<PriceCycle>('monthly');
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

  function listPanel() {
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

  function comparisonPanel() {
    if (!loaded) {
      return <CircularProgress aria-label={messages.common.loading} />;
    }
    if (query.data.length === 0) {
      return <EmptyState message={text.list.empty} action={createAction} />;
    }
    return (
      <Stack spacing={2}>
        <PriceCycleToggle value={cycle} onChange={setCycle} />
        <SubscriptionsComparisonTable
          subscriptions={query.data}
          cycle={cycle}
          canEdit={capabilities.canEdit}
          listSearch={search}
        />
      </Stack>
    );
  }

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
    return location.tab === 'comparison' ? comparisonPanel() : listPanel();
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
      <Tabs
        value={location.tab}
        onChange={(_event, next: SubscriptionsTab) => {
          setTab(next);
        }}
      >
        <Tab value="list" label={text.comparison.listTabLabel} />
        <Tab value="comparison" label={text.comparison.tabLabel} />
      </Tabs>
      {content()}
    </Stack>
  );
}
