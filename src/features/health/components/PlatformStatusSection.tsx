import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import { messages } from '@/shared/messages/es';

import { useNow } from '../hooks/useNow';
import type { PlatformStatusView } from '../hooks/usePlatformStatusSection';
import { formatReturnLine } from '../policy/returnLine';
import {
  componentStatusPresentation,
  overallStatusPresentation,
} from '../policy/statusPresentation';
import type { PlatformComponent, PlatformStatus } from '../schemas/publicStatus';
import { SectionAnnouncer } from './SectionAnnouncer';
import { StatusBadge } from './StatusBadge';

const text = messages.health.platform;

/** The database stopped by schedule, if the public status says so (FR-058). */
function stoppedDatabase(platform: PlatformStatus): PlatformComponent | undefined {
  return platform.components.find(
    (component) => component.kind === 'database' && component.status === 'stopped',
  );
}

/** When the database comes back; the clock alone changes it when that time arrives (FR-059). */
function ReturnLine({ nextStartAt }: { readonly nextStartAt: string }) {
  const now = useNow();
  return <Typography variant="body2">{formatReturnLine(nextStartAt, now)}</Typography>;
}

/** What the section says to a screen reader: its heading and everything it shows. */
function announcementOf(view: PlatformStatusView, now: number): string {
  switch (view.status) {
    case 'ready': {
      const database = stoppedDatabase(view.platform);
      const parts = [
        text.title,
        overallStatusPresentation(view.platform.status).label,
        ...(database === undefined
          ? []
          : [
              text.databaseStopped,
              ...(database.nextStartAt === null
                ? []
                : [formatReturnLine(database.nextStartAt, now)]),
            ]),
        ...view.platform.components.map(
          (component) =>
            `${component.name}: ${componentStatusPresentation(component.status).label}`,
        ),
      ];
      return parts.join('. ');
    }
    case 'empty':
      return `${text.title}. ${text.empty}`;
    case 'failed':
      return `${text.title}. ${text.failed}`;
    default:
      return '';
  }
}

/**
 * «Estado de la plataforma» (FR-057 to FR-064): the public status of maily-system-api, asked
 * without the token, when the access cannot be checked or the aggregator fails. It shows only what
 * the public status says, never another source, and never attributes the failure to a cause.
 */
export function PlatformStatusSection({
  view,
  announceToken,
}: {
  readonly view: PlatformStatusView;
  readonly announceToken: number;
}) {
  const titleId = useId();
  const now = useNow();

  if (view.status === 'hidden') {
    return null;
  }
  const settled =
    view.status === 'failed' ||
    ((view.status === 'ready' || view.status === 'empty') && !view.isRefreshing);
  const database = view.status === 'ready' ? stoppedDatabase(view.platform) : undefined;

  return (
    <Paper component="section" variant="outlined" aria-labelledby={titleId} sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" component="h2" id={titleId}>
          {text.title}
        </Typography>
        {view.status === 'loading' && <Typography>{text.loading}</Typography>}
        {view.status === 'failed' && <Typography>{text.failed}</Typography>}
        {view.status === 'empty' && <Typography>{text.empty}</Typography>}
        {view.status === 'ready' && (
          <>
            <StatusBadge presentation={overallStatusPresentation(view.platform.status)} />
            {database !== undefined && (
              <Stack spacing={0.5}>
                <Typography>{text.databaseStopped}</Typography>
                {database.nextStartAt !== null && <ReturnLine nextStartAt={database.nextStartAt} />}
              </Stack>
            )}
            <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {view.platform.components.map((component) => (
                <Stack
                  component="li"
                  key={component.code}
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Typography sx={{ overflowWrap: 'anywhere' }}>{component.name}</Typography>
                  <StatusBadge presentation={componentStatusPresentation(component.status)} />
                </Stack>
              ))}
            </Stack>
          </>
        )}
        {(view.status === 'ready' || view.status === 'empty') && view.isRefreshing && (
          <Typography variant="body2" color="text.secondary">
            {text.refreshing}
          </Typography>
        )}
      </Stack>
      <SectionAnnouncer
        settled={settled}
        text={announcementOf(view, now)}
        announceToken={announceToken}
      />
    </Paper>
  );
}
