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

describe('useRouteAccessibility: the route of Módulos (feature 013)', () => {
  it('titles the route after its page', () => {
    renderWithProviders(
      [{ path: '/modules', element: <Page />, handle: { titleKey: 'modules' } }],
      {
        route: '/modules',
      },
    );

    expect(messages.titles.modules).toBe('Módulos');
    expect(document.title).toBe(`Módulos — ${messages.common.appName}`);
  });
});
