import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { NavLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';

import type { SectionDefinition } from '../navigation/sections';

interface BottomNavProps {
  readonly visibleSections: readonly SectionDefinition[];
}

const itemSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0.5,
  px: 1,
  py: 0.5,
  color: 'inherit',
  textDecoration: 'none',
} as const;

/**
 * Bottom navigation bar, visible only below 768 px (research.md §9) — the same links as
 * `Topbar`'s, relocated for a thumb-reachable mobile layout. Its own label keeps it a distinct
 * landmark from `Topbar`'s navigation: a real browser only ever shows one of the two at a time.
 */
export function BottomNav({ visibleSections }: BottomNavProps) {
  return (
    <Box
      component="nav"
      aria-label={messages.nav.mobileLabel}
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'sticky',
        bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Stack
        component="ul"
        direction="row"
        sx={{ listStyle: 'none', m: 0, p: 0, width: '100%', justifyContent: 'space-around' }}
      >
        <li>
          <Box component={NavLink} to="/" end sx={itemSx}>
            <Icon name="dashboard" decorative />
            <Typography variant="caption">{messages.nav.home}</Typography>
          </Box>
        </li>
        {visibleSections.map((section) => (
          <li key={section.id}>
            <Box component={NavLink} to={section.path} sx={itemSx}>
              <Icon name={section.icon} decorative />
              <Typography variant="caption">{messages.nav.sections[section.labelKey]}</Typography>
            </Box>
          </li>
        ))}
      </Stack>
    </Box>
  );
}
