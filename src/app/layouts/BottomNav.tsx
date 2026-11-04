import Box from '@mui/material/Box';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import type { Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useId, useState } from 'react';
import { matchPath, NavLink, useLocation } from 'react-router';

import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';
import type { IconName } from '@/shared/ui/iconRegistry';

import type { SectionDefinition } from '../navigation/sections';

interface BottomNavProps {
  readonly visibleSections: readonly SectionDefinition[];
}

/** An entry of the bar: the Panel or one of the sections the person can read. */
interface NavEntry {
  readonly id: string;
  readonly path: string;
  /** Only the Panel (`/`): it is not the open screen just because every address starts with `/`. */
  readonly end: boolean;
  readonly label: string;
  readonly icon: IconName;
}

/**
 * A bottom navigation bar holds three to five destinations: in a narrow window, with more entries
 * than that, the first four stay in the bar and the fifth slot is «Más», which opens the rest.
 * Seven entries with their labels take about 460 px, and 320 px is the narrowest window supported.
 */
const MAX_SLOTS = 5;

/** Every slot takes the same share of the bar, as in MUI's `BottomNavigation`. */
const slotSx = { flex: '1 1 0', minWidth: 0, maxWidth: 168 } as const;

const itemSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0.5,
  width: '100%',
  px: 0.5,
  py: 0.5,
  color: 'inherit',
  textDecoration: 'none',
  textAlign: 'center',
  // A long label («Roles y permisos») goes over two lines rather than widening the page.
  overflowWrap: 'anywhere',
  // The open screen (`aria-current="page"`, set by `NavLink`), or «Más» when it holds it.
  '&[aria-current]': { color: 'primary.main', fontWeight: 600 },
} as const;

/** «Más» is a button that looks like the links next to it. */
const buttonSx = {
  border: 0,
  bgcolor: 'transparent',
  font: 'inherit',
  cursor: 'pointer',
} as const;

const labelSx = { fontWeight: 'inherit', lineHeight: 1.25 } as const;

/**
 * Bottom navigation bar, visible only below MUI's `md` breakpoint (research.md §9 of 008) — the
 * same links as `Topbar`'s, relocated for a thumb-reachable mobile layout. Its own label keeps it a
 * distinct landmark from `Topbar`'s navigation: a real browser only ever shows one of the two at a
 * time. Below `sm` (600 px), when there are more than five entries, the ones that do not fit go
 * under «Más» so that the page never scrolls sideways (FR-022, constitution VI).
 */
export function BottomNav({ visibleSections }: BottomNavProps) {
  // Read on the first render (`noSsr`), so a narrow window never paints the crowded bar first.
  const narrow = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'), { noSsr: true });
  const entries: NavEntry[] = [
    { id: 'home', path: '/', end: true, label: messages.nav.home, icon: 'dashboard' },
    ...visibleSections.map((section) => ({
      id: section.id,
      path: section.path,
      end: false,
      label: messages.nav.sections[section.labelKey],
      icon: section.icon,
    })),
  ];
  const crowded = narrow && entries.length > MAX_SLOTS;
  const inTheBar = crowded ? entries.slice(0, MAX_SLOTS - 1) : entries;
  const underMore = crowded ? entries.slice(MAX_SLOTS - 1) : [];

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
        sx={{ listStyle: 'none', m: 0, p: 0, width: '100%', justifyContent: 'center' }}
      >
        {inTheBar.map((entry) => (
          <Box component="li" key={entry.id} sx={slotSx}>
            <Box component={NavLink} to={entry.path} end={entry.end} sx={itemSx}>
              <Icon name={entry.icon} decorative />
              <Typography variant="caption" sx={labelSx}>
                {entry.label}
              </Typography>
            </Box>
          </Box>
        ))}
        {underMore.length > 0 && (
          <Box component="li" sx={slotSx}>
            <MoreMenu entries={underMore} />
          </Box>
        )}
      </Stack>
    </Box>
  );
}

interface MoreMenuProps {
  readonly entries: readonly NavEntry[];
}

/**
 * The «Más» slot and the menu it opens, with the same accessibility pattern as `ProfileMenu`
 * (`aria-haspopup`/`aria-controls`/`aria-expanded`, `useId()`). It is unmounted when the window
 * widens and every entry fits, which also closes the menu.
 */
function MoreMenu({ entries }: MoreMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const ids = { button: useId(), menu: useId() };
  const { pathname } = useLocation();
  const holdsOpenScreen = entries.some(
    (entry) => matchPath({ path: entry.path, end: false }, pathname) !== null,
  );

  function close(): void {
    setAnchor(null);
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        id={ids.button}
        aria-haspopup="menu"
        aria-controls={anchor === null ? undefined : ids.menu}
        aria-expanded={anchor === null ? undefined : 'true'}
        aria-current={holdsOpenScreen ? 'true' : undefined}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={[itemSx, buttonSx]}
      >
        <Icon name="more" decorative />
        <Typography variant="caption" sx={labelSx}>
          {messages.nav.more}
        </Typography>
      </Box>
      <Menu
        id={ids.menu}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ list: { 'aria-labelledby': ids.button } }}
      >
        {entries.map((entry) => (
          <MenuItem
            key={entry.id}
            component={NavLink}
            to={entry.path}
            onClick={close}
            sx={{
              '&[aria-current]': {
                color: 'primary.main',
                '& .MuiTypography-root': { fontWeight: 600 },
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <Icon name={entry.icon} decorative />
            </ListItemIcon>
            <ListItemText>{entry.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
