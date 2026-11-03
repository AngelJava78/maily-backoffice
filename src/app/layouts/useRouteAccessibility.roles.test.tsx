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

const DETAIL = {
  path: '/roles/:roleId',
  element: <Page />,
  handle: { titleKey: 'roleDetail', roleIdParam: 'roleId' },
};

describe('useRouteAccessibility: the routes of Roles y permisos', () => {
  it('titles the route of the table after its page (feature 014)', () => {
    renderWithProviders([{ path: '/roles', element: <Page />, handle: { titleKey: 'roles' } }], {
      route: '/roles',
    });

    expect(messages.titles.roles).toBe('Roles y permisos');
    expect(document.title).toBe(`Roles y permisos — ${messages.common.appName}`);
  });

  it('titles the route of the detail of a role after its page, for an id that is one (feature 027)', () => {
    renderWithProviders([DETAIL], { route: '/roles/7' });

    expect(messages.titles.roleDetail).toBe('Detalle del role');
    expect(document.title).toBe(`Detalle del role — ${messages.common.appName}`);
  });

  it.each(['/roles/abc', '/roles/007', '/roles/0', '/roles/12345678901'])(
    'titles %s as a page that does not exist, because its id is not one',
    (url) => {
      renderWithProviders([DETAIL], { route: url });

      expect(document.title).toBe(`${messages.titles.notFound} — ${messages.common.appName}`);
    },
  );
});

describe('useRouteAccessibility: the focus in Roles y permisos', () => {
  const routes = [{ path: '/roles', element: <Page />, handle: { titleKey: 'roles' } }, DETAIL];

  it('stays on the control that was used when only the query string changes (filters, paging)', async () => {
    const { router } = renderWithProviders(routes, { route: '/roles' });
    const next = screen.getByRole('button', { name: 'Página siguiente' });
    next.focus();

    await act(async () => {
      await router.navigate('/roles?type=sistema');
    });
    await act(async () => {
      await router.navigate('/roles?type=sistema&page=2', { replace: true });
    });

    expect(next).toHaveFocus();
  });

  it('moves to the heading of the detail that the person arrives at, and back to the table', async () => {
    const { router } = renderWithProviders(routes, { route: '/roles' });
    screen.getByRole('button', { name: 'Página siguiente' }).focus();

    await act(async () => {
      await router.navigate('/roles/7');
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Pantalla' })).toHaveFocus();

    screen.getByRole('button', { name: 'Página siguiente' }).focus();
    await act(async () => {
      await router.navigate('/roles', { replace: true });
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Pantalla' })).toHaveFocus();
  });
});
