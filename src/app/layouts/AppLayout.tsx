import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { useGrantedAccess } from '@/features/auth';
import { messages } from '@/shared/messages/es';
import { PageLoader } from '@/shared/ui/PageLoader';

import { getVisibleSections, sections as registeredSections } from '../navigation/sections';
import type { SectionDefinition } from '../navigation/sections';
import { BottomNav } from './BottomNav';
import { Topbar } from './Topbar';
import { useRouteAccessibility } from './useRouteAccessibility';

interface AppLayoutProps {
  /** The sections to offer; the registry by default, tests inject their own. */
  readonly sections?: readonly SectionDefinition[];
}

/**
 * Frame of the screens inside the application: skip link, header (`Topbar`, with the operator
 * and the way out) with a bottom navigation bar (`BottomNav`) below 768 px, and the main region.
 * It reflows from 1024 px down to 320 px without horizontal scrolling (FR-022).
 */
export function AppLayout({ sections = registeredSections }: AppLayoutProps) {
  useRouteAccessibility();
  const access = useGrantedAccess();
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

      <Topbar visibleSections={visibleSections} />

      <Container component="main" id="main-content" tabIndex={-1} sx={{ flexGrow: 1, py: 3 }}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Container>

      <BottomNav visibleSections={visibleSections} />
    </Box>
  );
}
