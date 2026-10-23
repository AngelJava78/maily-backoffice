import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useOperatorIdentity } from '@/features/auth';
import { messages } from '@/shared/messages/es';
import { Avatar } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { useNotify } from '@/shared/ui/Notifications';
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
 * initials and their active roles. The same avatar as the header's (FR-005, 011-profile-avatar-menu).
 */
export function ProfilePage() {
  const identity = useOperatorIdentity();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const notify = useNotify();

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
          <Avatar name={identity.displayName} id={identity.id} decorative />
          <Button
            size="small"
            startIcon={<Icon name="change-photo" decorative />}
            onClick={() => {
              notify({ severity: 'info', message: messages.profile.changePhotoUnavailable });
            }}
          >
            {messages.profile.changePhoto}
          </Button>
        </Stack>
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
