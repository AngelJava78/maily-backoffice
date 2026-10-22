import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { NavLink } from 'react-router';

import { LogoutButton, useOperatorIdentity } from '@/features/auth';
import { messages } from '@/shared/messages/es';

/**
 * The person's identity and the way out — unchanged from before this feature — plus an empty
 * slot reserved to the right for the profile icon (Spec 5) and the language switcher (Spec 7),
 * so neither has to touch this component to add itself (contracts/layout.md).
 */
export function HeaderUserMenu() {
  const { displayName } = useOperatorIdentity();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{displayName}</Typography>
      <Button color="inherit" component={NavLink} to="/profile">
        {messages.nav.profile}
      </Button>
      <LogoutButton />
      <Box data-testid="header-reserved-slot" aria-hidden />
    </Box>
  );
}
