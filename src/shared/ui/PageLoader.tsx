import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import { messages } from '@/shared/messages/es';

import { Icon } from './Icon';

/** Full-width loading indicator that screen readers announce as a status, web-soft's look: a
 * spinning icon next to the text, not a bare spinner (research.md §9). `role="status"` does not
 * take its name from its content (unlike a button or a link), so it is named after the visible
 * text via `aria-labelledby`, instead of repeating it in a separate `aria-label`. */
export function PageLoader() {
  const labelId = useId();

  return (
    <Box
      role="status"
      aria-labelledby={labelId}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        minHeight: '40vh',
        p: 3,
        '@keyframes page-loader-spin': { to: { transform: 'rotate(360deg)' } },
      }}
    >
      <Box sx={{ display: 'inline-flex', animation: 'page-loader-spin 1s linear infinite' }}>
        <Icon name="loading" decorative color="tenue" />
      </Box>
      <Typography id={labelId} color="text.secondary">
        {messages.common.loading}
      </Typography>
    </Box>
  );
}
