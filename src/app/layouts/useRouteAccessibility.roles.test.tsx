import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { useRouteAccessibility } from './useRouteAccessibility';

function Page() {
  useRouteAccessibility();
  return (
    <main>
      <h1 tabIndex={-1}>Pantalla</h1>
    </main>
  );
}

describe('useRouteAccessibility: the route of Roles y permisos (feature 014)', () => {
  it('titles the route after its page', () => {
    renderWithProviders([{ path: '/roles', element: <Page />, handle: { titleKey: 'roles' } }], {
      route: '/roles',
    });

    expect(messages.titles.roles).toBe('Roles y permisos');
    expect(document.title).toBe(`Roles y permisos — ${messages.common.appName}`);
  });
});
