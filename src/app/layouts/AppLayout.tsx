import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';

import { LogoutButton, useGrantedAccess, useOperatorIdentity } from '@/features/auth';
import { messages } from '@/shared/messages/es';
import { PageLoader } from '@/shared/ui/PageLoader';

import { getVisibleSections, sections as registeredSections } from '../navigation/sections';
import type { SectionDefinition } from '../navigation/sections';
import { useRouteAccessibility } from './useRouteAccessibility';

interface AppLayoutProps {
  /** The sections to offer; the registry by default, tests inject their own. */
  readonly sections?: readonly SectionDefinition[];
}

/**
 * Frame of the screens inside the application: skip link, header with the operator and the way
 * out, the navigation with the sections the person can read, and the main region. It reflows from
 * 1024 px down to 320 px without horizontal scrolling (FR-022).
 */
export function AppLayout({ sections = registeredSections }: AppLayoutProps) {
  useRouteAccessibility();
  const access = useGrantedAccess();
  const { displayName } = useOperatorIdentity();
  const visibleSections = getVisibleSections(access, sections);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Link
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          '&:focus': { left: 16, top: 16, zIndex: 'tooltip', bgcolor: 'background.paper', p: 1 },
        }}
      >
        {messages.nav.skipLink}
      </Link>

      <AppBar component="header" position="static">
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1, py: 1 }}>
          <Typography variant="h6" component="p" sx={{ flexGrow: 1 }}>
            {messages.common.appName}
          </Typography>
          <Typography sx={{ overflowWrap: 'anywhere' }}>{displayName}</Typography>
          <Button color="inherit" component={NavLink} to="/profile">
            {messages.nav.profile}
          </Button>
          <LogoutButton />
        </Toolbar>
      </AppBar>

      <Box component="nav" aria-label={messages.nav.label} sx={{ px: 2, py: 1 }}>
        <Stack
          component="ul"
          direction="row"
          useFlexGap
          spacing={1}
          sx={{ flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }}
        >
          <li>
            <Button component={NavLink} to="/" end>
              {messages.nav.home}
            </Button>
          </li>
          {visibleSections.map((section) => (
            <li key={section.id}>
              <Button component={NavLink} to={section.path}>
                {messages.nav.sections[section.labelKey]}
              </Button>
            </li>
          ))}
        </Stack>
      </Box>

      <Container component="main" id="main-content" tabIndex={-1} sx={{ flexGrow: 1, py: 3 }}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Container>
    </Box>
  );
}
