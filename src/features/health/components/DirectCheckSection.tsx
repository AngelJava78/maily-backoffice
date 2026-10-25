import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import { messages } from '@/shared/messages/es';

import type { DirectCheckView } from '../hooks/useDirectCheckSection';
import type { DirectCheckRow, DirectStatus } from '../policy/directCheckRules';
import type { StatusPresentation } from '../policy/statusPresentation';
import { SectionAnnouncer } from './SectionAnnouncer';
import { StatusBadge } from './StatusBadge';

const text = messages.health.direct;

/** Each status of a row, with its text, tone and an icon of its own (research D12). */
const PRESENTATION: Readonly<Record<DirectStatus, StatusPresentation>> = {
  operational: { label: text.status.operational, tone: 'success', icon: 'status-up' },
  degraded: { label: text.status.degraded, tone: 'warning', icon: 'status-degraded' },
  unreachable: { label: text.status.unreachable, tone: 'danger', icon: 'status-unreachable' },
};

/** What the section says to a screen reader: its heading and everything it shows. */
function announcementOf(rows: readonly DirectCheckRow[]): string {
  return [
    text.title,
    text.intro,
    ...rows.map((row) =>
      [`${row.name}: ${PRESENTATION[row.status].label}`, ...row.explanations].join('. '),
    ),
    text.others,
  ].join('. ');
}

/**
 * «Comprobación directa» (FR-068 to FR-075): what the browser could check by itself of the
 * services when neither the aggregator nor the public status answered. It marks nothing else,
 * works out no overall status and never shows a text of the answers; the rest is «Sin información».
 */
export function DirectCheckSection({
  view,
  announceToken,
}: {
  readonly view: DirectCheckView;
  readonly announceToken: number;
}) {
  const titleId = useId();

  if (view.status === 'hidden') {
    return null;
  }
  return (
    <Paper component="section" variant="outlined" aria-labelledby={titleId} sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" component="h2" id={titleId}>
          {text.title}
        </Typography>
        {view.status === 'loading' ? (
          <Typography>{text.loading}</Typography>
        ) : (
          <>
            <Typography>{text.intro}</Typography>
            <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {view.rows.map((row) => (
                <Stack component="li" key={row.code} spacing={0.5}>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Typography sx={{ overflowWrap: 'anywhere' }}>{row.name}</Typography>
                    <StatusBadge presentation={PRESENTATION[row.status]} />
                  </Stack>
                  {row.explanations.map((explanation) => (
                    <Typography key={explanation} variant="body2" color="text.secondary">
                      {explanation}
                    </Typography>
                  ))}
                </Stack>
              ))}
            </Stack>
            <Typography variant="body2">{text.others}</Typography>
            {view.isRefreshing && (
              <Typography variant="body2" color="text.secondary">
                {text.refreshing}
              </Typography>
            )}
          </>
        )}
      </Stack>
      <SectionAnnouncer
        settled={view.status === 'ready' && !view.isRefreshing}
        text={view.status === 'ready' ? announcementOf(view.rows) : ''}
        announceToken={announceToken}
      />
    </Paper>
  );
}
