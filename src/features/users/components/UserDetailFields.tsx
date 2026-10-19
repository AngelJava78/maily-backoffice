import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import type { PlatformUser } from '../schemas/user';
import { StatusChip } from './StatusChip';

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

/** Everything the platform keeps about a user, whatever its status (FR-003). */
export function UserDetailFields({ user }: { readonly user: PlatformUser }) {
  const { fields } = messages.users.detail;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
          columnGap: 4,
          rowGap: 1,
        }}
      >
        <Field label={fields.name}>{user.firstName}</Field>
        <Field label={fields.paternalLastName}>{user.paternalLastName}</Field>
        <Field label={fields.maternalLastName}>
          {user.maternalLastName ?? messages.users.detail.emptyValue}
        </Field>
        <Field label={fields.email}>{user.email}</Field>
        <Field label={fields.status}>
          <StatusChip status={user.status} />
        </Field>
        <Field label={fields.createdAt}>{formatDateTime(user.createdAt)}</Field>
        <Field label={fields.updatedAt}>{formatDateTime(user.updatedAt)}</Field>
      </Box>
    </Paper>
  );
}
