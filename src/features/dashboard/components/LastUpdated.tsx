import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

/**
 * When the data on screen was last updated, always with the date and with the seconds, so it
 * never looks recent when it is not and it shows the change within the same minute; next to it, a
 * discreet sign while a query is on its way (FR-009). Neither is announced: a refresh does not
 * interrupt a screen reader (FR-033).
 */
export function LastUpdated({
  updatedAt,
  isUpdating,
}: {
  readonly updatedAt: number;
  readonly isUpdating: boolean;
}) {
  return (
    <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">
        {messages.dashboard.lastUpdated(
          formatDateTime(new Date(updatedAt).toISOString(), { seconds: true }),
        )}
      </Typography>
      {isUpdating && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {/* Only decoration: the text next to it says the same. */}
          <CircularProgress size={14} aria-hidden />
          <Typography variant="body2" color="text.secondary">
            {messages.dashboard.updating}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
