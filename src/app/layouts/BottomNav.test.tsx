import { screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { operatorAccess } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';
import { matchMediaAtWidth } from '@/test/viewport';

import { AppLayout } from './AppLayout';

const sectionNames = messages.nav.sections;

/** Read access to the six sections of the registry: with the Panel, seven entries in the menu. */
const EVERY_SECTION = [
  'modules:read',
  'roles:read',
  'users:read',
  'subscriptions:read',
  'health:read',
  'token:read',
];

interface LayoutOptions {
  /** Width of the window, in px. */
  readonly width: number;
  readonly permissions?: readonly string[];
  readonly route?: string;
}

/** The layout with the real registry of sections, in a window `width` px wide. */
function renderLayout({ width, permissions = EVERY_SECTION, route = '/' }: LayoutOptions) {
  vi.spyOn(window, 'matchMedia').mockImplementation(matchMediaAtWidth(width));
  return renderWithProviders(
    [
      {
        path: '/',
        element: <AppLayout />,
        handle: { titleKey: 'home' },
        children: [
          { index: true, element: <h1>Page content</h1> },
          { path: '*', element: <h1>Another page</h1> },
        ],
      },
    ],
    { access: operatorAccess({ permissions: new Set(permissions) }), route },
  );
}

function mobileNavigation(): HTMLElement {
  return screen.getByRole('navigation', { name: messages.nav.mobileLabel });
}

/** The entries shown in the bar itself, by their visible text. */
function entriesInTheBar(): (string | null)[] {
  return within(mobileNavigation())
    .getAllByRole('link')
    .map((link) => link.textContent);
}

describe('BottomNav', () => {
  it('at 320 px with seven entries, keeps four in the bar and the other three under «Más»', async () => {
    const { user } = renderLayout({ width: 320 });

    expect(entriesInTheBar()).toEqual([
      messages.nav.home,
      sectionNames.modules,
      sectionNames.roles,
      sectionNames.users,
    ]);

    await user.click(within(mobileNavigation()).getByRole('button', { name: messages.nav.more }));

    const menu = screen.getByRole('menu', { name: messages.nav.more });
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      sectionNames.subscriptions,
      sectionNames.health,
      sectionNames.token,
    ]);
    expect(items.map((item) => item.getAttribute('href'))).toEqual([
      '/subscriptions',
      '/health',
      '/tools/postman-token',
    ]);
  });

  it('opens the screen chosen under «Más» and closes the menu', async () => {
    const { user, router } = renderLayout({ width: 320 });

    await user.click(within(mobileNavigation()).getByRole('button', { name: messages.nav.more }));
    await user.click(screen.getByRole('menuitem', { name: sectionNames.token }));

    expect(router.state.location.pathname).toBe('/tools/postman-token');
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('marks «Más» when the open screen is one of its entries, and that entry inside the menu', async () => {
    const { user } = renderLayout({ width: 320, route: '/tools/postman-token' });

    const more = within(mobileNavigation()).getByRole('button', { name: messages.nav.more });
    expect(more).toHaveAttribute('aria-current', 'true');

    await user.click(more);
    expect(screen.getByRole('menuitem', { name: sectionNames.token })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('menuitem', { name: sectionNames.health })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('does not mark «Más» when the open screen is in the bar itself', () => {
    renderLayout({ width: 320, route: '/users' });

    expect(
      within(mobileNavigation()).getByRole('button', { name: messages.nav.more }),
    ).not.toHaveAttribute('aria-current');
    expect(
      within(mobileNavigation()).getByRole('link', { name: sectionNames.users }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('at 320 px with five entries or fewer, shows them all in the bar, without «Más»', () => {
    renderLayout({
      width: 320,
      permissions: ['modules:read', 'roles:read', 'users:read', 'subscriptions:read'],
    });

    expect(entriesInTheBar()).toEqual([
      messages.nav.home,
      sectionNames.modules,
      sectionNames.roles,
      sectionNames.users,
      sectionNames.subscriptions,
    ]);
    expect(
      within(mobileNavigation()).queryByRole('button', { name: messages.nav.more }),
    ).not.toBeInTheDocument();
  });

  it('from 600 px up, shows the seven entries in the bar, without «Más»', () => {
    renderLayout({ width: 600 });

    expect(entriesInTheBar()).toEqual([
      messages.nav.home,
      sectionNames.modules,
      sectionNames.roles,
      sectionNames.users,
      sectionNames.subscriptions,
      sectionNames.health,
      sectionNames.token,
    ]);
    expect(
      within(mobileNavigation()).queryByRole('button', { name: messages.nav.more }),
    ).not.toBeInTheDocument();
  });

  it('has no accessibility violations at 320 px with «Más» open', async () => {
    const { user, container } = renderLayout({ width: 320 });
    await screen.findByRole('heading', { name: 'Page content' });
    expect(await axe(container)).toHaveNoViolations();

    await user.click(within(mobileNavigation()).getByRole('button', { name: messages.nav.more }));
    // The menu is portaled outside the landmarks, so it is checked on its own, as `ProfileMenu`'s.
    const menu = await screen.findByRole('menu', { name: messages.nav.more });
    expect(await axe(menu)).toHaveNoViolations();
  });
});
