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

/** The names in the list, in order: the primary text of each item. */
function listedNames(): string[] {
  const list = screen.getByRole('list', { name: text.list.label });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.MuiListItemText-primary')?.textContent ?? '');
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

describe(
  'Roles y permisos: Tipo and Estatus filters (feature 025, user stories 1 and 2)',
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

    it('US2-4, FR-012: a blocked role shows its explanation, with no error and no request for its permissions', async () => {
      const { roles } = start();
      const { user } = open('/roles?status=bloqueados');

      await user.click(await screen.findByText('Support'));

      expect(await screen.findByText(text.blocked.explanation)).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Support', level: 2 })).toBeVisible();
      expect(screen.queryByText(messages.errors.unexpected)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('list', { name: text.detail.matrixTitle('Support') }),
      ).not.toBeInTheDocument();
      expect(
        roles.requests.filter((request) => request.path === '/api/v1/roles/3/permissions'),
      ).toEqual([]);
    });

    it('US4-1: the filters and the role survive a reload of the address', async () => {
      start();
      const first = open('/roles?type=clinica&status=bloqueados&roleId=8');
      await screen.findByText(text.blocked.explanation);
      first.unmount();

      open('/roles?type=clinica&status=bloqueados&roleId=8');

      expect(await screen.findByRole('heading', { name: 'Nurse', level: 2 })).toBeVisible();
      expect(filterButton(text.filters.typeLabel, text.filters.type.clinic)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(filterButton(text.filters.statusLabel, text.filters.status.blocked)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  },
);
