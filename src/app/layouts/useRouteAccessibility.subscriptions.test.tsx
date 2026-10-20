import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { useRouteAccessibility } from './useRouteAccessibility';
import { uuidOf } from '@/test/ids';

function Page() {
  useRouteAccessibility();
  return (
    <main>
      <h1 tabIndex={-1}>Pantalla</h1>
    </main>
  );
}

const title = (text: string) => `${text} — ${messages.common.appName}`;

describe('useRouteAccessibility: the routes of the subscriptions section', () => {
  it.each([
    ['/subscriptions', '/subscriptions', 'subscriptions', 'Suscripciones', undefined],
    [
      '/subscriptions/new',
      '/subscriptions/new',
      'subscriptionCreate',
      'Nueva suscripción',
      undefined,
    ],
    [
      '/subscriptions/:subscriptionId',
      '/subscriptions/7',
      'subscriptionDetail',
      'Detalle de la suscripción',
      'subscriptionId',
    ],
    [
      '/subscriptions/:subscriptionId/edit',
      '/subscriptions/2147483647/edit',
      'subscriptionEdit',
      'Editar suscripción',
      'subscriptionId',
    ],
  ] as const)('titles the route %s after its page', (path, url, titleKey, text, idParam) => {
    renderWithProviders(
      [{ path, element: <Page />, handle: { titleKey, subscriptionIdParam: idParam } }],
      { route: url },
    );

    expect(messages.titles[titleKey]).toBe(text);
    expect(document.title).toBe(title(text));
  });

  it.each([
    ['/subscriptions/:subscriptionId', '/subscriptions/abc', 'subscriptionDetail'],
    ['/subscriptions/:subscriptionId', '/subscriptions/0', 'subscriptionDetail'],
    ['/subscriptions/:subscriptionId', '/subscriptions/007', 'subscriptionDetail'],
    ['/subscriptions/:subscriptionId', `/subscriptions/${uuidOf(7)}`, 'subscriptionDetail'],
    ['/subscriptions/:subscriptionId/edit', '/subscriptions/abc/edit', 'subscriptionEdit'],
  ] as const)(
    'titles %s at %s as a page that does not exist, because its id is not one',
    (path, url, titleKey) => {
      renderWithProviders(
        [{ path, element: <Page />, handle: { titleKey, subscriptionIdParam: 'subscriptionId' } }],
        { route: url },
      );

      expect(document.title).toBe(title(messages.titles.notFound));
    },
  );

  it('keeps the titles of the users section as they were', () => {
    renderWithProviders(
      [
        {
          path: '/users/:userId',
          element: <Page />,
          handle: { titleKey: 'userDetail', userIdParam: 'userId' },
        },
      ],
      { route: `/users/${uuidOf(121)}` },
    );

    expect(document.title).toBe(title(messages.titles.userDetail));
  });

  it('does not take a subscription id for a user id, nor the other way round', () => {
    renderWithProviders(
      [
        {
          path: '/users/:userId',
          element: <Page />,
          handle: { titleKey: 'userDetail', userIdParam: 'userId' },
        },
      ],
      { route: '/users/7' },
    );

    expect(document.title).toBe(title(messages.titles.notFound));
  });
});
