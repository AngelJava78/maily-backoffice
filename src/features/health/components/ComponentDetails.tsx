import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import { messages } from '@/shared/messages/es';

import {
  checkNameLabel,
  checkStatusLabel,
  describeComponentError,
  latencyLabel,
} from '../policy/statusPresentation';
import type { HealthComponent } from '../schemas/healthResult';

const text = messages.health.details;

/**
 * The detail of a component that its toggle unfolds (FR-015): the error of the component explained
 * in Spanish (FR-016) and each check with its name, its status in text and its latency, or that
 * there is nothing more to say. `id` is the one that the toggle names in `aria-controls`.
 */
export function ComponentDetails({
  id,
  component,
  expanded,
}: {
  readonly id: string;
  readonly component: HealthComponent;
  readonly expanded: boolean;
}) {
  const checksTitleId = useId();
  const { checks, error } = component;

  return (
    <Collapse in={expanded} id={id}>
      <Stack spacing={1} sx={{ pt: 1 }}>
        {error !== null && (
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {describeComponentError(error)}
          </Typography>
        )}
        {checks.length > 0 && (
          <Box>
            <Typography variant="subtitle2" component="h4" id={checksTitleId}>
              {text.checksTitle}
            </Typography>
            <Box component="ul" aria-labelledby={checksTitleId} sx={{ m: 0, pl: 3 }}>
              {checks.map((check, index) => (
                // The checks have no id of their own: their place in the answer is what they are.
                <Typography
                  component="li"
                  variant="body2"
                  key={index}
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {`${checkNameLabel(check.name)}: ${checkStatusLabel(check.status)}, ${latencyLabel(check.latencyMs)}`}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
        {checks.length === 0 && error === null && (
          <Typography variant="body2">{text.none}</Typography>
        )}
      </Stack>
    </Collapse>
  );
}
