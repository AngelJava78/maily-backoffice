import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Icon } from '@/shared/ui/Icon';
import { RefreshFailedAlert } from '@/shared/ui/RefreshFailedAlert';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import { describeMonitoredComponentError } from '../api/monitoredComponentErrors';
import { ComponentDetailFields } from '../components/ComponentDetailFields';
import { ComponentGone } from '../components/ComponentGone';
import { DeleteComponentAction } from '../components/DeleteComponentAction';
import { useMonitoredComponent } from '../hooks/useMonitoredComponents';
import type { HealthCapabilities } from '../policy/healthCapabilities';

const text = messages.health.registry;

/**
 * «Detalle del componente» (FR-035): every datum of a registered component and the actions that
 * the capabilities allow. The title is on screen from the first render, while the data load, so the
 * focus can go to it; a component that another person deleted takes the person back to the list.
 */
export function MonitoredComponentDetailPage({
  componentId,
  capabilities,
}: {
  readonly componentId: string;
  readonly capabilities: HealthCapabilities;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const query = useMonitoredComponent(componentId);
  const outcome = query.isError ? describeMonitoredComponentError(query.error, 'get') : null;

  /** The way back, with the actions beside it once the component is known. */
  function toolbar(actions?: ReactNode) {
    return (
      <Stack
        direction="row"
        useFlexGap
        sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button
          component={RouterLink}
          to="/health/components"
          startIcon={<Icon name="arrow-back" decorative />}
        >
          {text.backToList}
        </Button>
        {actions}
      </Stack>
    );
  }

  function content() {
    if (outcome?.kind === 'notFound') {
      return <ComponentGone componentId={componentId} />;
    }
    const retry = () => {
      void query.refetch();
    };
    if (outcome !== null && query.data === undefined) {
      return (
        <>
          {toolbar()}
          <ErrorState
            title={text.errors.loadError.detailTitle}
            message={text.errors.loadError.message}
            onRetry={retry}
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
    const component = query.data;
    return (
      <>
        {toolbar(
          <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
            {capabilities.canEdit && (
              <Button
                component={RouterLink}
                to={`/health/components/${component.id}/edit`}
                variant="contained"
                startIcon={<Icon name="edit" decorative />}
              >
                {text.edit}
              </Button>
            )}
            {capabilities.canDelete && <DeleteComponentAction component={component} />}
          </Stack>,
        )}
        {outcome !== null && (
          <RefreshFailedAlert message={text.errors.loadError.message} onRetry={retry} />
        )}
        <ComponentDetailFields component={component} />
      </>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.titles.healthComponentDetail}
      </Typography>
      {content()}
    </Stack>
  );
}
