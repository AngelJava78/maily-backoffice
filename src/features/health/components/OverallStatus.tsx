import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import {
  overallStatusPresentation,
  type OverallStatus as Status,
} from '../policy/statusPresentation';
import type { HealthComponent } from '../schemas/healthResult';
import { StatusBadge } from './StatusBadge';

/**
 * The overall status of the platform as the aggregator gives it, never worked out again (FR-010):
 * its text, icon and tone, and how many of the components received are up.
 */
export function OverallStatus({
  status,
  components,
}: {
  readonly status: Status;
  readonly components: readonly HealthComponent[];
}) {
  const up = components.filter((component) => component.status === 'up').length;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusBadge presentation={overallStatusPresentation(status)} />
        <Typography>{messages.health.overall.operationalCount(up, components.length)}</Typography>
      </Stack>
    </Paper>
  );
}
