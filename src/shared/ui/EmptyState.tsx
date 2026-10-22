import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { Icon } from './Icon';
import type { IconName } from './iconRegistry';

interface EmptyStateProps {
  /** Optional: web-soft draws an empty state as plain centred text, unlike loading (FR-012). */
  readonly icon?: IconName;
  readonly message: string;
  readonly action?: ReactNode;
}

/** Nothing to show, web-soft's look: a centred message, with an optional icon and action. */
export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', p: 3 }}>
      {icon === undefined ? null : <Icon name={icon} decorative size="lg" color="tenue" />}
      <Typography color="text.secondary">{message}</Typography>
      {action}
    </Stack>
  );
}
