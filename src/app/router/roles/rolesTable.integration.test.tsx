import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createRolesCatalogMock,
  rolesCatalogScenario,
} from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock, directoryRole } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

// The screens are lazy, and the first visit transforms the Data Grid, which takes a while when many
// files run at once: load them here so that no test pays for it while it waits for a screen.
beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/roles/components/RolesPage'),
    import('@/features/roles/components/RoleDetailPage'),
  ]);
}, 90_000);

const text = messages.roles;
const BLOCKED = 2;

/**
 * The seed (5 Sistema and 4 Clínica, all active) plus `extra` active roles of Sistema, «Zeta 01» and
 * so on from id 20, which sort after the seed ones. With the 12 of by default there are 21 roles:
 * three pages of ten.
 */
function start(extra = 12) {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock({
    ...scenario.directory,
    roles: [
      ...scenario.directory.roles,
      ...Array.from({ length: extra }, (_, index) =>
        directoryRole({
          id: 20 + index,
          name: `Zeta ${String(index + 1).padStart(2, '0')}`,
          typeId: 1,
        }),
      ),
    ],
  });
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const typeButton = (name: string) =>
  within(screen.getByRole('group', { name: text.filters.typeLabel })).getByRole('button', {
    name,
  });

describe(
  'Roles y permisos: the table and its address (feature 027, user story 4)',
  { timeout: 30_000 },
  () => {
    it('US4-1, SC-002: keeps the filters, the page and its size after seeing a detail and going back, and after a reload', async () => {
      start(30);
      const first = open('/roles?type=sistema&page=2&page_size=25');
      // 35 roles of Sistema, 25 per page: the second page has the last ten.
      expect(await screen.findByText('26–35 de 35')).toBeInTheDocument();

      await first.user.click(screen.getByRole('link', { name: 'Zeta 25' }));
      expect(await screen.findByRole('heading', { level: 1, name: 'Zeta 25' })).toBeVisible();
      await first.user.click(await screen.findByRole('link', { name: text.detail.backToList }));

      expect(await screen.findByText('26–35 de 35')).toBeInTheDocument();
      expect(first.router.state.location.search).toBe('?type=sistema&page=2&page_size=25');
      first.unmount();

      // A reload opens the same address: nothing else is kept.
      const second = open('/roles?type=sistema&page=2&page_size=25');
      expect(await screen.findByText('26–35 de 35')).toBeInTheDocument();
      expect(typeButton(text.filters.type.system)).toHaveAttribute('aria-pressed', 'true');
      expect(second.router.state.location.search).toBe('?type=sistema&page=2&page_size=25');
    });

    it('US4-2: changing a filter from the second page goes back to the first and keeps the page size', async () => {
      start(30);
      const { user, router } = open('/roles?page=2&page_size=25');
      expect(await screen.findByText('26–39 de 39')).toBeInTheDocument();

      await user.click(typeButton(text.filters.type.system));

      expect(await screen.findByText('1–25 de 35')).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type=sistema&page_size=25');
    });

    it('US4-1: an address with values that are not valid is rewritten as the table with its defaults', async () => {
      start();
      const { router } = open('/roles?type=xyz&status=otro&page=0&page_size=7');

      expect(await screen.findByText('1–10 de 21')).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.search).toBe('');
      });
      expect(router.state.location.pathname).toBe('/roles');
    });

    it('US4-3: a page after the last one is corrected to the last page, with no entry of its own in the history', async () => {
      start();
      const { router } = open('/roles?page=99');

      expect(await screen.findByText('21–21 de 21')).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.search).toBe('?page=3');
      });
      expect(screen.getByRole('link', { name: 'Zeta 12' })).toBeVisible();
      expect(router.state.historyAction).toBe('REPLACE');
    });

    it('shows every role on one page with 25 per page', async () => {
      start();

      open('/roles?page_size=25');

      expect(await screen.findByText('1–21 de 21')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Zeta 12' })).toBeVisible();
    });

    describe('links from before feature 027 (?roleId=), which open what they showed (US4-4, US4-5, SC-005)', () => {
      it('opens the detail of an active role', async () => {
        start();

        const { router } = open('/roles?roleId=7');

        expect(await screen.findByRole('heading', { level: 1, name: 'Doctor' })).toBeVisible();
        expect(await screen.findByLabelText(text.detail.fields.name)).toHaveValue('Doctor');
        expect(router.state.location.pathname).toBe('/roles/7');
        expect(screen.getByRole('link', { name: text.detail.backToList })).toHaveAttribute(
          'href',
          '/roles',
        );
      });

      it('opens the detail of a blocked role, with the table of its Tipo and Estatus to go back to', async () => {
        const { users } = start();
        users.setRoleStatus(8, BLOCKED);

        const { user, router } = open('/roles?type=clinica&status=bloqueados&roleId=8');

        expect(await screen.findByRole('heading', { level: 1, name: 'Nurse' })).toBeVisible();
        expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
        const back = screen.getByRole('link', { name: text.detail.backToList });
        expect(back).toHaveAttribute('href', '/roles?type=clinica&status=bloqueados');

        await user.click(back);

        expect(await screen.findByRole('link', { name: 'Nurse' })).toBeVisible();
        expect(router.state.location.search).toBe('?type=clinica&status=bloqueados');
      });

      it('ignores an id that is not one, and opens the table', async () => {
        start();

        const { router } = open('/roles?type=sistema&roleId=abc');

        expect(await screen.findByRole('link', { name: 'Administrator' })).toBeVisible();
        await waitFor(() => {
          expect(router.state.location.search).toBe('?type=sistema');
        });
        expect(router.state.location.pathname).toBe('/roles');
        expect(screen.queryByText(messages.errors.unexpected)).not.toBeInTheDocument();
      });
    });

    it('FR-017 of 014, FR-020, SC-006: leaving the section from the main menu with changes that are not saved asks first', async () => {
      start();
      const { user, router } = open('/roles/2');
      const nameField = await screen.findByLabelText(text.detail.fields.name);
      await user.type(nameField, ' Jr');
      const link = () =>
        within(screen.getByRole('navigation', { name: messages.nav.label })).getByRole('link', {
          name: messages.nav.sections.users,
        });

      await user.click(link());

      const dialog = await screen.findByRole('dialog', { name: text.detail.unsavedChangesTitle });
      await user.click(
        within(dialog).getByRole('button', { name: text.detail.unsavedChangesStay }),
      );
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(router.state.location.pathname).toBe('/roles/2');
      expect(nameField).toHaveValue('Developer Jr');

      await user.click(link());
      await user.click(
        await screen.findByRole('button', { name: text.detail.unsavedChangesDiscard }),
      );

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users');
      });
    });
  },
);
