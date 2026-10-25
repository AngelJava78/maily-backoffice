import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { messages } from '@/shared/messages/es';
import { PageLoader } from '@/shared/ui/PageLoader';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

import {
  HealthLoadFailure,
  HealthPermissionNotice,
  HealthRefreshFailed,
} from '../components/HealthFailureNotice';
import { BackofficeBuildBlock } from '../components/BackofficeBuildBlock';
import { FallbackSections } from '../components/FallbackSections';
import { HealthResultView } from '../components/HealthResultView';
import { HealthToolbar } from '../components/HealthToolbar';
import { useHealthCycle, type HealthPageView } from '../hooks/useHealthCycle';
import type { BackofficeBuild } from '../policy/backofficeBuild';

/** The failure of FR-030, above the sections of the chain and the data it kept. */
function HealthFailure({
  view,
  onRetry,
}: {
  readonly view: HealthPageView;
  readonly onRetry: () => void;
}) {
  if (view.status === 'failed') {
    return (
      <HealthLoadFailure
        authorizationUnavailable={view.authorizationUnavailable}
        onRetry={onRetry}
      />
    );
  }
  return view.status === 'ready' && view.refreshFailed ? (
    <HealthRefreshFailed authorizationUnavailable={view.authorizationUnavailable} />
  ) : null;
}

/** What goes below the failure, by the state of the page (data-model §10). */
function HealthPageContent({ view }: { readonly view: HealthPageView }) {
  switch (view.status) {
    case 'loading':
      return <PageLoader />;
    case 'forbidden':
      return <HealthPermissionNotice />;
    case 'ready':
      return <HealthResultView result={view.result} />;
    case 'failed':
      return null;
  }
}

/**
 * «Salud de servicios» (feature 016, contracts/app-routes.md): the health of every component of
 * Maily as the aggregator of maily-system-api reports it, asked again every `refreshMs`. A small
 * composition (constitution I): the heading, which takes the focus when the page opens, the bar
 * (nothing of it without permission), the notice of a failed refresh while there is data, and the
 * state of its cycle.
 */
export function HealthPage({
  refreshMs,
  build,
}: {
  readonly refreshMs: number;
  readonly build: BackofficeBuild;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { view, refresh } = useHealthCycle(refreshMs);
  // Each «Actualizar» or «Reintentar» of the person: the sections are announced again (FR-063).
  const [asked, setAsked] = useState(0);
  const ask = (): void => {
    setAsked((current) => current + 1);
    refresh();
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.health.page.title}
      </Typography>
      {view.status !== 'forbidden' && (
        <HealthToolbar
          freshness={
            view.status === 'ready'
              ? { updatedAt: view.updatedAt, isUpdating: view.isUpdating, onRefresh: ask }
              : undefined
          }
        />
      )}
      <HealthFailure view={view} onRetry={ask} />
      {(view.status === 'failed' || view.status === 'ready') && (
        <FallbackSections scope="page" announceToken={asked} />
      )}
      <HealthPageContent view={view} />
      {/* In the load, with data and with a failure, but not without permission (FR-044). */}
      {view.status !== 'forbidden' && <BackofficeBuildBlock build={build} />}
    </Stack>
  );
}
