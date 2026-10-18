import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { messages } from '@/shared/messages/es';

/** Full-width loading indicator that screen readers announce as a status. */
export function PageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '40vh',
        p: 3,
      }}
    >
      <CircularProgress role="status" aria-label={messages.common.loading} />
    </Box>
  );
}
