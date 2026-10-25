import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

const text = messages.health.platform;

/** The frame of a placeholder: the heading of the section and one line. */
function Placeholder({ line }: { readonly line: string }) {
  return (
    <Paper component="section" variant="outlined" aria-label={text.title} sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" component="h2">
          {text.title}
        </Typography>
        <Typography>{line}</Typography>
      </Stack>
    </Paper>
  );
}

/**
 * Light placeholders for the sections of «No se pudo comprobar el acceso», exported without the
 * lazy chunk of the sections (research D9, D20): while that chunk loads, and if it cannot load,
 * which is then the failure of FR-060 and never breaks the screen.
 */
export function FallbackLoadingPlaceholder() {
  return <Placeholder line={text.loading} />;
}

export function FallbackFailedPlaceholder() {
  return <Placeholder line={text.failed} />;
}
