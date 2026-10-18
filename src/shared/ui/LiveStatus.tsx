import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

/**
 * A polite announcement for screen readers that is always in the page, and empty until there is
 * something to say: a live region only announces what is written into it after it exists, so one
 * that is created together with its text is easily missed (WCAG 4.1.3). It is not seen.
 */
export function LiveStatus({ children }: { readonly children?: ReactNode }) {
  return (
    <Box
      role="status"
      sx={{
        position: 'absolute',
        // Strings: in `sx` a bare 1 is 100 %, not a pixel.
        width: '1px',
        height: '1px',
        margin: '-1px',
        padding: 0,
        border: 0,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}
