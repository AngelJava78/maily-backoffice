import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { NavLink } from 'react-router';

import { useThemeMode } from '@/app/providers/ThemeModeProvider';
import { LogoutButton, useOperatorIdentity } from '@/features/auth';
import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';

/**
 * The person's identity and the way out — unchanged from before this feature — the light/dark
 * toggle (009-dark-mode-toggle, contracts/theme-mode.md), and an empty slot reserved to the right
 * for the profile icon (Spec 5) and the language switcher (Spec 7), so neither has to touch this
 * component to add itself (contracts/layout.md). The toggle sits before that reserved slot, never
 * inside it.
 */
export function HeaderUserMenu() {
  const { displayName } = useOperatorIdentity();
  const { mode, toggle } = useThemeMode();
  const switchingTo =
    mode === 'claro' ? messages.nav.theme.switchToDark : messages.nav.theme.switchToLight;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{displayName}</Typography>
      <Button color="inherit" component={NavLink} to="/profile">
        {messages.nav.profile}
      </Button>
      <LogoutButton />
      <IconButton color="inherit" aria-label={switchingTo} onClick={toggle}>
        <Icon name={mode === 'claro' ? 'theme-dark' : 'theme-light'} decorative />
      </IconButton>
      <Box data-testid="header-reserved-slot" aria-hidden />
    </Box>
  );
}
