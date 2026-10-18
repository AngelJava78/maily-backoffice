import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { useRouteAccessibility } from './useRouteAccessibility';

function Page() {
  useRouteAccessibility();
  return <h1>Pantalla</h1>;
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

  it('ignores a title key it does not know and keeps the name of the application', () => {
    renderWithProviders([{ path: '/users', element: <Page />, handle: { titleKey: 'nope' } }], {
      route: '/users',
    });

    expect(document.title).toBe(messages.common.appName);
  });
});
