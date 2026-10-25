import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, type ReactNode } from 'react';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';

import { componentStatusPresentation, kindLabel, latencyLabel } from '../policy/statusPresentation';
import type { HealthComponent } from '../schemas/healthResult';
import { ComponentDetails } from './ComponentDetails';
import { StatusBadge } from './StatusBadge';

const text = messages.health;

/** The short commit shows its first seven characters (FR-012), or all of them if it has fewer. */
const SHORT_COMMIT_LENGTH = 7;

/** A datum the component may not know: «No disponible» when it does not (FR-014). */
function orNotAvailable(value: string | null, format: (known: string) => string = String) {
  return value === null ? text.notAvailable : format(value);
}

/** A label and its value; they reflow to one column on narrow screens, and long texts wrap. */
function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <>
      <Typography component="dt" variant="body2" sx={{ fontWeight: 'bold' }}>
        {label}
      </Typography>
      <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </>
  );
}

/**
 * A component of the platform as the aggregator reports it (FR-012 to FR-016): its name, its data
 * and a toggle for its detail. Whether the detail is unfolded belongs to the page, so it stays so
 * after each refresh (FR-015).
 */
export function ComponentCard({
  component,
  expanded,
  onToggle,
}: {
  readonly component: HealthComponent;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}) {
  const detailsId = useId();

  return (
    <Paper component="li" variant="outlined" sx={{ p: 2, listStyle: 'none' }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" component="h3" sx={{ overflowWrap: 'anywhere' }}>
          {component.name}
        </Typography>
        <Box
          component="dl"
          sx={{
            m: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
            columnGap: 2,
            rowGap: 0.5,
            alignItems: 'center',
          }}
        >
          <Field label={text.fields.kind}>{kindLabel(component.kind)}</Field>
          <Field label={text.fields.status}>
            <StatusBadge presentation={componentStatusPresentation(component.status)} />
          </Field>
          <Field label={text.fields.latency}>{latencyLabel(component.latencyMs)}</Field>
          <Field label={text.fields.checkedAt}>
            {orNotAvailable(component.checkedAt, (iso) => formatDateTime(iso, { seconds: true }))}
          </Field>
          <Field label={text.fields.version}>{orNotAvailable(component.version)}</Field>
          <Field label={text.fields.commit}>
            {orNotAvailable(component.commit, (commit) => commit.slice(0, SHORT_COMMIT_LENGTH))}
          </Field>
          <Field label={text.fields.buildDate}>
            {orNotAvailable(component.buildDate, (iso) => formatDateTime(iso))}
          </Field>
          <Field label={text.fields.environment}>{orNotAvailable(component.environment)}</Field>
        </Box>
        <Box>
          <Button
            size="small"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={text.details.toggleLabel(component.name)}
            endIcon={
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  transform: expanded ? 'rotate(180deg)' : 'none',
                  transition: (theme) => theme.transitions.create('transform'),
                }}
              >
                <Icon name="arrow-drop-down" decorative />
              </Box>
            }
          >
            {text.details.toggle}
          </Button>
        </Box>
        <ComponentDetails id={detailsId} component={component} expanded={expanded} />
      </Stack>
    </Paper>
  );
}
