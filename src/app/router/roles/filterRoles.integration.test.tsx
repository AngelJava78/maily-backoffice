import { configure, screen, waitFor, within } from '@testing-library/react';
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

/** The seed (5 Sistema, 4 Clínica), with Support (Sistema, 3) and Nurse (Clínica, 8) blocked. */
function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  users.setRoleStatus(3, BLOCKED);
  users.setRoleStatus(8, BLOCKED);
  return { users, roles };
}

function open(url = '/roles') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const filterButton = (group: string, name: string) =>
  within(screen.getByRole('group', { name: group })).getByRole('button', { name });

/** The names in the table, in order: the link of the column Nombre of each row (feature 027). */
function listedNames(): string[] {
  const grid = screen.getByRole('grid', { name: text.list.gridLabel });
  return within(grid)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

const ALL_ACTIVE = [
  'Administrator',
  'Billing',
  'Developer',
  'Doctor',
  'Marketing',
  'Owner',
  'Receptionist',
];

// What opening a role does (its detail, a blocked role, a reload with `/roles/{id}`) is checked in
// `roleDetail.integration.test.tsx`, which needs the screen of the detail.
describe(
  'Roles y permisos: the table with the Tipo and Estatus filters (features 025 and 027, user story 1)',
  { timeout: 30_000 },
  () => {
    it.each([
      [text.filters.type.all, text.filters.status.active, ALL_ACTIVE],
      [
        text.filters.type.system,
        text.filters.status.active,
        ['Administrator', 'Billing', 'Developer', 'Marketing'],
      ],
      [text.filters.type.clinic, text.filters.status.active, ['Doctor', 'Owner', 'Receptionist']],
      [text.filters.type.all, text.filters.status.blocked, ['Nurse', 'Support']],
      [text.filters.type.system, text.filters.status.blocked, ['Support']],
      [text.filters.type.clinic, text.filters.status.blocked, ['Nurse']],
    ])(
      'SC-001: %s + %s shows exactly the roles of that combination, at most two presses away',
      async (type, status, expected) => {
        start();
        const { user } = open();
        await screen.findByText('Owner');

        if (type !== text.filters.type.all) {
          await user.click(filterButton(text.filters.typeLabel, type));
        }
        if (status !== text.filters.status.active) {
          await user.click(filterButton(text.filters.statusLabel, status));
        }

        await waitFor(() => {
          expect(listedNames()).toEqual(expected);
        });
      },
    );
  },
);
