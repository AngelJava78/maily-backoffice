import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryRole,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';
import { uuidOf } from '@/test/ids';

// The screens are lazy, and the first visit transforms the Data Grid, which takes a while when many
// files run at once: load them here so that no test pays for it while it waits for a screen.
beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/users/components/UsersListPage'),
    import('@/features/users/components/UserDetailPage'),
  ]);
}, 90_000);

const text = messages.users;
const ACTIVE = 1;
const BLOCKED = 2;
const DELETED = 3;

/** Roles of the default catalog: 4 Marketing is of type Sistema and 6 Doctor of type Clínica. */
const MARKETING = 4;
const DOCTOR = 6;
/** A role of type Clínica that is blocked: it does not count for the type of whoever has it. */
const NURSING = 8;

/**
 * The operator (Admin Sistema, of type Sistema) and the users of the sample data of spec 018 of the
 * users API, all with the paternal last name López.
 */
function start() {
  const base = defaultDirectory();
  const people: [number, string, number, number[]][] = [
    [2, 'Ana', ACTIVE, [MARKETING]],
    [3, 'Beto', ACTIVE, [DOCTOR]],
    [4, 'Carla', ACTIVE, [MARKETING, DOCTOR]],
    [5, 'Diego', ACTIVE, []],
    [6, 'Elena', ACTIVE, [NURSING]],
    [7, 'Gabi', BLOCKED, [DOCTOR]],
    [8, 'Hugo', BLOCKED, [MARKETING]],
    [9, 'Irene', DELETED, [MARKETING]],
  ];
  return createUsersDirectoryMock({
    users: [
      ...base.users,
      ...people.map(([id, firstName, statusId]) =>
        directoryUser({
          id: uuidOf(id),
          firstName,
          paternalLastName: 'López',
          email: `${firstName.toLowerCase()}@clinica.com`,
          statusId,
        }),
      ),
    ],
    roles: [
      ...base.roles,
      directoryRole({ id: NURSING, name: 'Enfermería', typeId: 2, statusId: BLOCKED }),
    ],
    associations: [
      ...base.associations,
      ...people.flatMap(([id, , , roleIds]) =>
        roleIds.map((roleId) => ({ userId: uuidOf(id), roleId })),
      ),
    ],
  });
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const grid = () => screen.getByRole('grid', { name: text.list.gridLabel });
const typeGroup = () => screen.getByRole('group', { name: text.filters.typeLabel });
const statusGroup = () => screen.getByRole('group', { name: text.filters.statusLabel });
const namesInGrid = () =>
  within(grid())
    .getAllByRole('link')
    .map((link) => link.textContent);
/** The text of the Tipo cell in the row of this user. */
const typeOf = (name: string) =>
  within(grid())
    .getByRole('link', { name })
    .closest('[role="row"]')
    ?.querySelector('[data-field="type"]')?.textContent;

describe(
  'the users section: filtering by Tipo (feature 026, user story 1)',
  { timeout: 30_000 },
  () => {
    it('lists the active users of both types with their type, Todos and Activos pressed (US1-1, US1-4)', async () => {
      start();
      open('/users');

      expect(await screen.findByText('1–6 de 6')).toBeInTheDocument();
      expect(namesInGrid()).toEqual([
        'Admin Sistema',
        'Ana López',
        'Beto López',
        'Carla López',
        'Diego López',
        'Elena López',
      ]);
      expect(typeOf('Admin Sistema')).toBe('Sistema');
      expect(typeOf('Beto López')).toBe('Clínica');
      expect(typeOf('Carla López')).toBe('Sistema y Clínica');
      // Diego has no roles; the only role of Elena is blocked (US1-5).
      expect(typeOf('Diego López')).toBe(text.list.noType);
      expect(typeOf('Elena López')).toBe(text.list.noType);
      expect(
        within(typeGroup()).getByRole('button', { name: 'Todos', pressed: true }),
      ).toBeVisible();
    });

    it('shows only the users of the type pressed, with their own total (US1-2, US1-3)', async () => {
      start();
      const { user, router } = open('/users');
      await screen.findByText('1–6 de 6');

      await user.click(within(typeGroup()).getByRole('button', { name: 'Sistema' }));
      expect(await screen.findByText('1–3 de 3')).toBeInTheDocument();
      expect(namesInGrid()).toEqual(['Admin Sistema', 'Ana López', 'Carla López']);
      expect(router.state.location.search).toBe('?type_id=1');

      await user.click(within(typeGroup()).getByRole('button', { name: 'Clínica' }));
      expect(await screen.findByText('1–2 de 2')).toBeInTheDocument();
      // Carla has active roles of both types: she answers both filters.
      expect(namesInGrid()).toEqual(['Beto López', 'Carla López']);

      await user.click(within(typeGroup()).getByRole('button', { name: 'Todos' }));
      expect(await screen.findByText('1–6 de 6')).toBeInTheDocument();
      expect(router.state.location.search).toBe('');
    });
  },
);

describe(
  'the users section: filtering by Estatus (feature 026, user story 2)',
  { timeout: 30_000 },
  () => {
    it('lists only the blocked users, never the deleted or the active ones (US2-1, US2-3)', async () => {
      start();
      const { user } = open('/users');
      await screen.findByText('1–6 de 6');

      await user.click(within(statusGroup()).getByRole('button', { name: 'Bloqueados' }));

      expect(await screen.findByText('1–2 de 2')).toBeInTheDocument();
      expect(namesInGrid()).toEqual(['Gabi López', 'Hugo López']);
      expect(within(grid()).getAllByText(text.status.blocked)).toHaveLength(2);
      expect(typeOf('Gabi López')).toBe('Clínica');
      expect(typeOf('Hugo López')).toBe('Sistema');
    });

    it.each([
      ['Sistema', ['Hugo López']],
      ['Clínica', ['Gabi López']],
    ])('combines Bloqueados with %s (US2-2)', async (type, names) => {
      start();
      const { user } = open('/users?status_id=2');
      await screen.findByText('1–2 de 2');

      await user.click(within(typeGroup()).getByRole('button', { name: type }));

      expect(await screen.findByText('1–1 de 1')).toBeInTheDocument();
      expect(namesInGrid()).toEqual(names);
    });

    it('opens a blocked user from the table, unblocks it and, back with the same filters, it is among the active ones (US2-4, SC-007)', async () => {
      start();
      const { user, router } = open('/users?type_id=2&status_id=2');
      await screen.findByText('1–1 de 1');

      await user.click(within(grid()).getByRole('link', { name: 'Gabi López' }));
      await user.click(await screen.findByRole('button', { name: text.actions.unblock }));
      const dialog = await screen.findByRole('dialog', { name: text.dialogs.unblock.title });
      await user.click(within(dialog).getByRole('button', { name: text.dialogs.unblock.confirm }));
      expect(await screen.findByText(text.statusNotices.unblocked)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await user.click(await screen.findByRole('link', { name: text.detail.backToList }));

      expect(await screen.findByText(text.list.emptyBlockedOfType('Clínica'))).toBeInTheDocument();
      expect(router.state.location.search).toBe('?type_id=2&status_id=2');

      await user.click(within(statusGroup()).getByRole('button', { name: 'Activos' }));
      expect(await screen.findByText('1–3 de 3')).toBeInTheDocument();
      expect(namesInGrid()).toEqual(['Beto López', 'Carla López', 'Gabi López']);
    });
  },
);
