import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import type { MonitoredComponent } from '../schemas/monitoredComponent';

const text = messages.health.registry;

/** A label and its value; they reflow to one column on narrow screens, and long texts wrap. */
function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <>
      <Typography component="dt" sx={{ fontWeight: 'bold' }}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </>
  );
}

/**
 * Every datum of a registered component (FR-035): the base URL is a text, never a link (FR-007),
 * and a frontend shows its health route and its information route, without readiness.
 */
export function ComponentDetailFields({ component }: { readonly component: MonitoredComponent }) {
  const isFrontend = component.kind === 'frontend';
  const none = messages.health.notAvailable;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
          columnGap: 3,
          rowGap: 1,
        }}
      >
        <Field label={text.fields.name}>{component.name}</Field>
        <Field label={text.fields.code}>{component.code}</Field>
        <Field label={text.fields.kind}>{text.kinds[component.kind]}</Field>
        <Field label={text.fields.baseUrl}>{component.baseUrl}</Field>
        <Field label={isFrontend ? text.fields.healthPath : text.fields.livePath}>
          {component.livePath}
        </Field>
        {!isFrontend && <Field label={text.fields.readyPath}>{component.readyPath ?? none}</Field>}
        <Field label={text.fields.infoPath}>{component.infoPath ?? none}</Field>
        <Field label={text.fields.enabled}>
          {component.enabled ? text.enabled : text.disabled}
        </Field>
        <Field label={text.fields.sortOrder}>{component.sortOrder}</Field>
        <Field label={text.fields.createdAt}>{formatDateTime(component.createdAt)}</Field>
        <Field label={text.fields.updatedAt}>{formatDateTime(component.updatedAt)}</Field>
      </Box>
    </Paper>
  );
}
