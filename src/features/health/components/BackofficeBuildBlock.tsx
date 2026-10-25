import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useId, type ReactNode } from 'react';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import type { BackofficeBuild } from '../policy/backofficeBuild';

const text = messages.health.backoffice;

/** The short commit shows its first seven characters, or all of them if it has fewer. */
const SHORT_COMMIT_LENGTH = 7;

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
 * «Backoffice» (FR-044): the version, the short commit and the date of this build, fixed when it
 * was built. It does not depend on the aggregator, and a datum that is missing is «No disponible».
 */
export function BackofficeBuildBlock({ build }: { readonly build: BackofficeBuild }) {
  const titleId = useId();
  const none = messages.health.notAvailable;

  return (
    <Paper component="section" variant="outlined" aria-labelledby={titleId} sx={{ p: 2 }}>
      <Typography variant="h6" component="h2" id={titleId} sx={{ mb: 1 }}>
        {text.title}
      </Typography>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
          columnGap: 2,
          rowGap: 0.5,
        }}
      >
        <Field label={text.version}>{build.version ?? none}</Field>
        <Field label={text.commit}>{build.commit?.slice(0, SHORT_COMMIT_LENGTH) ?? none}</Field>
        <Field label={text.buildDate}>
          {build.buildDate === null ? none : formatDateTime(build.buildDate)}
        </Field>
      </Box>
    </Paper>
  );
}
