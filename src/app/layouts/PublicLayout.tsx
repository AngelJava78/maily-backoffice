import Container from '@mui/material/Container';
import { Outlet } from 'react-router';

import { useRouteAccessibility } from './useRouteAccessibility';

/** Frame of the screens that need no session: one centred column that reflows down to 320 px. */
export function PublicLayout() {
  useRouteAccessibility();

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh', py: 4 }}
    >
      <Outlet />
    </Container>
  );
}
