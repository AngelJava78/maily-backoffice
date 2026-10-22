import Box from '@mui/material/Box';
import { useState } from 'react';

import { messages } from '@/shared/messages/es';

import brandHorizontal from '@/assets/brand/maily-horizontal.png';

interface LogoProps {
  readonly height?: number;
}

/**
 * MailySoft's horizontal wordmark, copied from web-soft (research.md §8). If the image fails to
 * load, falls back to the name in text, the same way web-soft's own brand component does, so the
 * app is never left unidentified.
 */
export function Logo({ height = 28 }: LogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Box
        component="span"
        sx={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' }}
      >
        {messages.common.brandNameLowercase}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={brandHorizontal}
      alt={messages.common.brandName}
      sx={{ height, display: 'block' }}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
