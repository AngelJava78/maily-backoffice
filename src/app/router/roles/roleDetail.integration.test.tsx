import { act, configure, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createRolesCatalogMock,
  rolesCatalogScenario,
} from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(() => {
  configure({ asyncUtilTimeout: 10_000 });
});

const text = messages.roles;
const BLOCKED = 2;

/** The seed (5 Sistema, 4 Clínica, all active): Developer is role 2, Support 3 and Nurse 8. */
function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const backLink = () => screen.findByRole('link', { name: text.detail.backToList });

describe(
  'Roles y permisos: the screen of the detail of a role (feature 027, user story 2)',
  { timeout: 30_000 },
  () => {
    it('US2-1, FR-011: an address of a role opens its detail with its name as the title, and no table', async () => {
      start();

      open('/roles/2');

      expect(await screen.findByRole('heading', { level: 1, name: 'Developer' })).toBeVisible();
      expect(await screen.findByLabelText(text.detail.fields.name)).toHaveValue('Developer');
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: text.filters.typeLabel })).not.toBeInTheDocument();
    });

    it('US2-5, FR-012: the address of a blocked role opens its detail, with the explanation and no request for its permissions', async () => {
      const { users, roles } = start();
      users.setRoleStatus(3, BLOCKED);

      open('/roles/3');

      expect(await screen.findByRole('heading', { level: 1, name: 'Support' })).toBeVisible();
      expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
      expect(screen.getByRole('button', { name: text.status.unblock })).toBeVisible();
      expect(screen.queryByText(messages.errors.unexpected)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(text.detail.fields.name)).not.toBeInTheDocument();
      expect(roles.requests.filter((request) => request.path.endsWith('/permissions'))).toEqual([]);
    });

    it('US2-6, FR-014: the address of a role that does not exist says so, with a way back to the table', async () => {
      start();

      const { user, router } = open('/roles/9999');

      expect(await screen.findByText(text.detail.notFound.title)).toBeVisible();
      expect(screen.queryByText(messages.errors.unexpected)).not.toBeInTheDocument();

      await user.click(await backLink());

      expect(router.state.location.pathname).toBe('/roles');
      expect(await screen.findByRole('grid', { name: text.list.gridLabel })).toBeVisible();
    });

    it.each(['/roles/abc', '/roles/007', '/roles/0'])(
      'US2-6: %s is a page that does not exist, because its id is not one',
      async (url) => {
        start();

        open(url);

        expect(await screen.findByText(messages.notFound.title)).toBeVisible();
        expect(screen.queryByLabelText(text.detail.fields.name)).not.toBeInTheDocument();
      },
    );

    it('US2-3, SC-002: pressing a name opens its detail, and «Volver al listado» goes back to the same table', async () => {
      start();
      const { user, router } = open('/roles?type=sistema');

      await user.click(await screen.findByRole('link', { name: 'Developer' }));

      expect(await screen.findByRole('heading', { level: 1, name: 'Developer' })).toBeVisible();
      expect(router.state.location.pathname).toBe('/roles/2');
      const back = await backLink();
      expect(back).toHaveAttribute('href', '/roles?type=sistema');

      await user.click(back);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?type=sistema');
      expect(await screen.findByRole('grid', { name: text.list.gridLabel })).toBeVisible();
      expect(screen.getByRole('link', { name: 'Developer' })).toBeVisible();
      expect(screen.queryByRole('link', { name: 'Owner' })).not.toBeInTheDocument();
    });

    it('US2-3, FR-013: the Back button of the browser also goes back to the same table', async () => {
      start();
      const { user, router } = open('/roles?status=bloqueados&type=clinica');
      // Nothing is blocked: the table is empty, so look the role up in the active ones first.
      await user.click(await screen.findByRole('button', { name: text.filters.status.active }));
      await user.click(await screen.findByRole('link', { name: 'Owner' }));
      await screen.findByRole('heading', { level: 1, name: 'Owner' });

      act(() => {
        window.history.back();
      });

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/roles');
      });
      expect(router.state.location.search).toBe('?type=clinica');
      expect(await screen.findByRole('grid', { name: text.list.gridLabel })).toBeVisible();
    });

    it('US2-5: a blocked role opened from the table of Bloqueados goes back to that table', async () => {
      const { users } = start();
      users.setRoleStatus(3, BLOCKED);
      const { user, router } = open('/roles?status=bloqueados');

      await user.click(await screen.findByRole('link', { name: 'Support' }));

      expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
      await user.click(await backLink());

      await waitFor(() => {
        expect(router.state.location.search).toBe('?status=bloqueados');
      });
      expect(await screen.findByRole('link', { name: 'Support' })).toBeVisible();
    });

    it('US4-1: the detail survives a reload of its address, also the one of a blocked role', async () => {
      const { users } = start();
      users.setRoleStatus(8, BLOCKED);
      const first = open('/roles/8');
      await screen.findByText(text.blocked.explanation);
      first.unmount();

      open('/roles/8');

      expect(await screen.findByRole('heading', { level: 1, name: 'Nurse' })).toBeVisible();
      expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
    });
  },
);
