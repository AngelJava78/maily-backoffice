import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router';

import { pageOf } from '@/shared/lib/pageOf';
import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Icon } from '@/shared/ui/Icon';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeMonitoredComponentError } from '../api/monitoredComponentErrors';
import { ComponentsGrid } from '../components/ComponentsGrid';
import { useComponentsLocation } from '../hooks/useComponentsLocation';
import { useMonitoredComponents } from '../hooks/useMonitoredComponents';
import type { HealthCapabilities } from '../policy/healthCapabilities';

const text = messages.health.registry;

/**
 * «Componentes monitoreados» (FR-034, FR-043): the registry, one page at a time in the browser,
 * with the way back to «Salud de servicios» and «Nuevo componente» for whoever may register. The
 * integrated components are always monitored, without being registered, and the page says so.
 */
export function MonitoredComponentsListPage({
  capabilities,
}: {
  readonly capabilities: HealthCapabilities;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { location, setPage, setPageSize } = useComponentsLocation();
  const query = useMonitoredComponents();
  const loaded = query.data !== undefined;
  const shown = pageOf(query.data ?? [], location.page, location.pageSize);
  const pageWasClamped = loaded && shown.pageWasClamped;

  // A page that does not exist goes to the last one, once the list arrived, without a history entry.
  useEffect(() => {
    if (pageWasClamped) {
      setPage(shown.page, { replace: true });
    }
  }, [pageWasClamped, shown.page, setPage]);

  const createAction = capabilities.canCreate ? (
    <Button
      component={RouterLink}
      to="/health/components/new"
      variant="contained"
      startIcon={<Icon name="add" decorative />}
    >
      {text.create}
    </Button>
  ) : undefined;

  function content() {
    if (query.isError && !loaded) {
      const outcome = describeMonitoredComponentError(query.error, 'list');
      if (outcome.kind === 'forbidden') {
        return <Alert severity="info">{text.noPermission}</Alert>;
      }
      const cause =
        outcome.kind === 'unavailable' && outcome.authorizationUnavailable
          ? ` ${messages.health.page.authorizationUnavailable}`
          : '';
      return (
        <ErrorState
          title={text.errors.loadError.listTitle}
          message={`${text.errors.loadError.message}${cause}`}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }
    return (
      <ComponentsGrid
        components={shown.items}
        total={shown.total}
        page={shown.page}
        pageSize={location.pageSize}
        loading={!loaded}
        onPaginationChange={(nextPage, nextPageSize) => {
          if (nextPageSize === location.pageSize) {
            setPage(nextPage, { replace: pageWasClamped });
          } else {
            setPageSize(nextPageSize);
          }
        }}
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Button
        component={RouterLink}
        to="/health"
        startIcon={<Icon name="arrow-back" decorative />}
        sx={{ alignSelf: 'flex-start' }}
      >
        {text.backToHealth}
      </Button>
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
      <Typography color="text.secondary">{text.builtInNote}</Typography>
      {content()}
    </Stack>
  );
}
