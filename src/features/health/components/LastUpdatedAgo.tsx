import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import { useNow } from '../hooks/useNow';
import { formatElapsed } from '../policy/refreshRules';

/**
 * How long ago the data on screen arrived, moved every second (FR-027), and a discreet sign while
 * the aggregator is asked again. Neither is announced: a refresh never interrupts a screen reader
 * (FR-063, research D14).
 */
export function LastUpdatedAgo({
  updatedAt,
  isUpdating,
}: {
  readonly updatedAt: number;
  readonly isUpdating: boolean;
}) {
  const now = useNow();

  return (
    <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">
        {formatElapsed(updatedAt, now)}
      </Typography>
      {isUpdating && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {/* Only decoration: the text next to it says the same. */}
          <CircularProgress size={14} aria-hidden />
          <Typography variant="body2" color="text.secondary">
            {messages.health.page.updating}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
