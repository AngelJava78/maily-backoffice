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

describe('useRouteAccessibility: the route of the Token tool (feature 005)', () => {
  it('titles the route after its page', () => {
    renderWithProviders(
      [{ path: '/tools/postman-token', element: <Page />, handle: { titleKey: 'token' } }],
      { route: '/tools/postman-token' },
    );

    expect(messages.titles.token).toBe('Token');
    expect(document.title).toBe(`Token — ${messages.common.appName}`);
  });
});
