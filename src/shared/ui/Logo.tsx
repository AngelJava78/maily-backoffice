import Box from '@mui/material/Box';
import { useState } from 'react';

import { messages } from '@/shared/messages/es';
import { colorTokens, radiusTokens, shadowTokens } from '@/shared/theme/tokens';

import brandHorizontal from '@/assets/brand/maily-horizontal.png';

interface LogoProps {
  readonly height?: number;
}

/**
 * MailySoft's horizontal wordmark, copied from web-soft (research.md §8), on a fixed light chip
 * (009-dark-mode-toggle, research.md D6): the image itself is coloured for a light background, so
 * the chip stays the same in both themes instead of swapping with `colorTokensOscuro` — it is what
 * keeps the logo legible on the top bar, whose own background does change between themes
 * (data-model.md → "Tratamiento de contraste del logotipo"). If the image fails to load, falls
 * back to the name in text, the same way web-soft's own brand component does, so the app is never
 * left unidentified; the fallback gets its own dark colour too, since it would otherwise inherit
 * the top bar's light text colour and disappear against this same chip.
 */
export function Logo({ height = 28 }: LogoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Box
      data-testid="logo-contrast-chip"
      sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: colorTokens.superficie,
        borderRadius: `${radiusTokens.xl}px`,
        boxShadow: shadowTokens.card,
        px: 1,
        py: 0.5,
      }}
    >
      {failed ? (
        <Box
          component="span"
          sx={{
            fontSize: '1.125rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: colorTokens.tinta,
          }}
        >
          {messages.common.brandNameLowercase}
        </Box>
      ) : (
        <Box
          component="img"
          src={brandHorizontal}
          alt={messages.common.brandName}
          sx={{ height, display: 'block' }}
          onError={() => {
            setFailed(true);
          }}
        />
      )}
    </Box>
  );
}
