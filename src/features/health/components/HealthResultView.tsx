import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';

import { messages } from '@/shared/messages/es';

import type { HealthResult } from '../schemas/healthResult';
import { ComponentCard } from './ComponentCard';
import { HealthNotices } from './HealthNotices';
import { OverallStatus } from './OverallStatus';

const text = messages.health.page;

/**
 * The result of the aggregator (contracts/app-routes.md, points 5 to 7): the overall status, the
 * notices and every component in the order received, without paging or filtering (FR-011). A
 * component never hides the others, whatever its status (FR-019). The unfolded details are kept by
 * code, so they stay unfolded after each refresh (FR-015).
 */
export function HealthResultView({ result }: { readonly result: HealthResult }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const componentsTitleId = useId();

  function toggle(code: string): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(code)) {
        next.add(code);
      }
      return next;
    });
  }

  return (
    <Stack spacing={3}>
      <OverallStatus status={result.status} components={result.components} />
      <HealthNotices result={result} />
      <Box component="section" aria-labelledby={componentsTitleId}>
        <Typography variant="h6" component="h2" id={componentsTitleId} sx={{ mb: 1 }}>
          {text.componentsTitle}
        </Typography>
        {result.components.length === 0 ? (
          <Typography>{text.empty}</Typography>
        ) : (
          <Stack component="ul" spacing={2} sx={{ m: 0, p: 0 }}>
            {result.components.map((component) => (
              <ComponentCard
                key={component.code}
                component={component}
                expanded={expanded.has(component.code)}
                onToggle={() => {
                  toggle(component.code);
                }}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
