import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import { useNow } from '../hooks/useNow';
import { formatReturnLine } from '../policy/returnLine';
import type { HealthResult } from '../schemas/healthResult';

const { notices } = messages.health;

/** When the database comes back; the clock changes it from «Vuelve…» to «Su encendido…» (FR-059). */
function ReturnLine({ nextStartAt }: { readonly nextStartAt: string }) {
  const now = useNow();
  return <Typography variant="body2">{formatReturnLine(nextStartAt, now)}</Typography>;
}

/**
 * The notices that explain the result (FR-017, FR-018): the database stopped by schedule, with when
 * it comes back, or not answering, and the registry that could not be read. They only explain, the
 * aggregator decides the status, and they are no failure: `role="note"`, never an alert that
 * interrupts (research D12, FR-049).
 */
export function HealthNotices({ result }: { readonly result: HealthResult }) {
  const database = result.components.find((component) => component.kind === 'database');
  const databaseNotice =
    database?.status === 'stopped'
      ? notices.databaseStopped
      : database?.status === 'down'
        ? notices.databaseDown
        : null;

  if (databaseNotice === null && result.registryAvailable) {
    return null;
  }
  return (
    <Stack spacing={2}>
      {databaseNotice !== null && (
        <Alert severity={database?.status === 'stopped' ? 'info' : 'warning'} role="note">
          {databaseNotice}
          {database?.status === 'stopped' && database.nextStartAt !== null && (
            <ReturnLine nextStartAt={database.nextStartAt} />
          )}
        </Alert>
      )}
      {!result.registryAvailable && (
        <Alert severity="warning" role="note">
          {notices.registryUnavailable}
        </Alert>
      )}
    </Stack>
  );
}
