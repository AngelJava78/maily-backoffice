import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { useRouteAccessibility } from './useRouteAccessibility';

function Page() {
  useRouteAccessibility();
  return (
    <main>
      <h1 tabIndex={-1}>Pantalla</h1>
      <button type="button">Página siguiente</button>
    </main>
  );
}

describe('useRouteAccessibility: the routes of the users section', () => {
  it.each([
    ['/users', '/users', 'users', 'Usuarios'],
    ['/users/new', '/users/new', 'userCreate', 'Crear usuario'],
    ['/users/:userId', '/users/121', 'userDetail', 'Detalle del usuario'],
    ['/users/:userId/edit', '/users/121/edit', 'userEdit', 'Editar usuario'],
  ] as const)('titles the route %s after its page', (path, url, titleKey, title) => {
    renderWithProviders([{ path, element: <Page />, handle: { titleKey } }], { route: url });

    expect(messages.titles[titleKey]).toBe(title);
    expect(document.title).toBe(`${title} — ${messages.common.appName}`);
  });

  it.each([
    ['/users/:userId', '/users/abc', 'userDetail'],
    ['/users/:userId', '/users/0', 'userDetail'],
    ['/users/:userId/edit', '/users/abc/edit', 'userEdit'],
  ] as const)(
    'titles %s at %s as a page that does not exist, because its id is not one',
    (path, url, titleKey) => {
      renderWithProviders(
        [{ path, element: <Page />, handle: { titleKey, userIdParam: 'userId' } }],
        { route: url },
      );

      expect(document.title).toBe(`${messages.titles.notFound} — ${messages.common.appName}`);
    },
  );

  it('keeps the title of the page for an id that is one', () => {
    renderWithProviders(
      [
        {
          path: '/users/:userId',
          element: <Page />,
          handle: { titleKey: 'userDetail', userIdParam: 'userId' },
        },
      ],
      { route: '/users/121' },
    );

    expect(document.title).toBe(`${messages.titles.userDetail} — ${messages.common.appName}`);
  });

  it('ignores a title key it does not know and keeps the name of the application', () => {
    renderWithProviders([{ path: '/users', element: <Page />, handle: { titleKey: 'nope' } }], {
      route: '/users',
    });

    expect(document.title).toBe(messages.common.appName);
  });
});

describe('useRouteAccessibility: the focus', () => {
  const routes = [
    { path: '/users', element: <Page />, handle: { titleKey: 'users' } },
    { path: '/users/new', element: <Page />, handle: { titleKey: 'userCreate' } },
  ];

  it('stays on the control that was used when only the query string changes (paging, searching)', async () => {
    const { router } = renderWithProviders(routes, { route: '/users' });
    const next = screen.getByRole('button', { name: 'Página siguiente' });
    next.focus();

    await act(async () => {
      await router.navigate('/users?page=2');
    });
    await act(async () => {
      await router.navigate('/users?page=3', { replace: true });
    });

    expect(next).toHaveFocus();
  });

  it('moves to the heading of the page that the person arrives at', async () => {
    const { router } = renderWithProviders(routes, { route: '/users' });
    screen.getByRole('button', { name: 'Página siguiente' }).focus();

    await act(async () => {
      await router.navigate('/users/new');
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Pantalla' })).toHaveFocus();
  });
});
