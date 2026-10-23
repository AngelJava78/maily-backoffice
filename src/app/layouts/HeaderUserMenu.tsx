import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

import { useThemeMode } from '@/app/providers/ThemeModeProvider';
import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';

import { ProfileMenu } from './ProfileMenu';

/**
 * The person's identity and the way out, now the avatar menu (011-profile-avatar-menu,
 * contracts/profile-menu.md) instead of a plain name and loose "Perfil"/"Cerrar sesión" controls —
 * it took over the slot `008-design-system` had reserved here for "the profile icon (Spec 5)". The
 * light/dark toggle (009-dark-mode-toggle, contracts/theme-mode.md) sits before it, and a new empty
 * slot stays reserved after it for the language switcher (Spec 7), so that Spec doesn't have to
 * touch this component either.
 */
export function HeaderUserMenu() {
  const { mode, toggle } = useThemeMode();
  const switchingTo =
    mode === 'claro' ? messages.nav.theme.switchToDark : messages.nav.theme.switchToLight;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton color="inherit" aria-label={switchingTo} onClick={toggle}>
        <Icon name={mode === 'claro' ? 'theme-dark' : 'theme-light'} decorative />
      </IconButton>
      <ProfileMenu />
      <Box data-testid="language-reserved-slot" aria-hidden />
    </Box>
  );
}
