import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import { NavLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { colorTokens } from '@/shared/theme/tokens';
import { Icon } from '@/shared/ui/Icon';
import { Logo } from '@/shared/ui/Logo';

import type { SectionDefinition } from '../navigation/sections';
import { HeaderUserMenu } from './HeaderUserMenu';

interface TopbarProps {
  readonly visibleSections: readonly SectionDefinition[];
}

/**
 * Fixed top bar, web-soft's layout (research.md §9): navigation with icon + label, visible from
 * 768 px up — below it, the same links move to `BottomNav`. This bar carries the header
 * landmark at every width, with the profile link and the log out button always inside it
 * (contracts/layout.md); only the in-bar navigation list is desktop-only.
 */
export function Topbar({ visibleSections }: TopbarProps) {
  return (
    <AppBar component="header" position="static">
      <Toolbar sx={{ flexWrap: 'wrap', gap: 2, py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Logo />
          <Chip
            label={messages.nav.appLabel}
            size="small"
            sx={{
              bgcolor: alpha(colorTokens.superficie, 0.16),
              color: 'inherit',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          />
        </Box>

        <Box
          component="nav"
          aria-label={messages.nav.label}
          sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}
        >
          <Stack
            component="ul"
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }}
          >
            <li>
              <Button
                color="inherit"
                component={NavLink}
                to="/"
                end
                startIcon={<Icon name="dashboard" decorative />}
              >
                {messages.nav.home}
              </Button>
            </li>
            {visibleSections.map((section) => (
              <li key={section.id}>
                <Button
                  color="inherit"
                  component={NavLink}
                  to={section.path}
                  startIcon={<Icon name={section.icon} decorative />}
                >
                  {messages.nav.sections[section.labelKey]}
                </Button>
              </li>
            ))}
          </Stack>
        </Box>

        <HeaderUserMenu />
      </Toolbar>
    </AppBar>
  );
}
