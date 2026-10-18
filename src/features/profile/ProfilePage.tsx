import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useOperatorIdentity } from '@/features/auth';
import { messages } from '@/shared/messages/es';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

/** A label and its value; they reflow to one column on narrow screens. */
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
 * The profile of the operator, read only (FR-012): the data the platform keeps about them, their
 * initials and their active roles. The platform stores no image, so the avatar shows the initials.
 */
export function ProfilePage() {
  const identity = useOperatorIdentity();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar aria-hidden sx={{ bgcolor: 'primary.main' }}>
          {identity.initials}
        </Avatar>
        <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
          {messages.profile.title}
        </Typography>
      </Stack>

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
          <Field label={messages.profile.name}>{identity.firstName}</Field>
          <Field label={messages.profile.paternalLastName}>{identity.paternalLastName}</Field>
          <Field label={messages.profile.maternalLastName}>
            {identity.maternalLastName ?? messages.profile.emptyValue}
          </Field>
          <Field label={messages.profile.email}>{identity.email}</Field>
          <Field label={messages.profile.roles}>
            {identity.roles.length === 0 ? (
              messages.profile.noRoles
            ) : (
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {identity.roles.map((role) => (
                  <li key={role.id}>{role.name}</li>
                ))}
              </Box>
            )}
          </Field>
        </Box>
      </Paper>
    </Stack>
  );
}
