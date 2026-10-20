import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageLoader } from '@/shared/ui/PageLoader';
import { RefreshFailedAlert } from '@/shared/ui/RefreshFailedAlert';

import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { DashboardIndicators } from './DashboardIndicators';
import { DashboardPermissionNotice } from './DashboardPermissionNotice';
import { LastUpdated } from './LastUpdated';
import { RecentClinicsTable } from './RecentClinicsTable';

const text = messages.dashboard;

/**
 * The summary of the platform on the Panel (contracts/app-routes.md): the indicators, the recent
 * clinics and when they were updated, refreshed every `refreshIntervalMs`. It only draws the state
 * that the query is in (data-model.md, «Estados de la pantalla»), and it is read only: no action,
 * link or button, not even to retry, because the next cycle tries again by itself (FR-010,
 * FR-026).
 */
export function DashboardSummary({ refreshIntervalMs }: { readonly refreshIntervalMs: number }) {
  const view = useDashboardSummary(refreshIntervalMs);
  const indicatorsHeadingId = useId();

  switch (view.status) {
    case 'loading':
      return <PageLoader />;
    case 'failed':
      return <ErrorState title={text.loadError.title} message={text.loadError.message} />;
    case 'forbidden':
      return <DashboardPermissionNotice />;
    case 'ready':
      return (
        <Stack spacing={3}>
          {/* Above the data it speaks of; it stays mounted while the failure lasts (FR-034). */}
          {view.refreshFailed && <RefreshFailedAlert message={text.refreshFailed} />}
          <Box component="section" aria-labelledby={indicatorsHeadingId}>
            <Typography variant="h6" component="h2" id={indicatorsHeadingId} sx={{ mb: 1 }}>
              {text.indicatorsTitle}
            </Typography>
            <DashboardIndicators summary={view.summary} />
          </Box>
          <RecentClinicsTable clinics={view.summary.recentClinics} />
          <LastUpdated updatedAt={view.updatedAt} isUpdating={view.isUpdating} />
        </Stack>
      );
  }
}
