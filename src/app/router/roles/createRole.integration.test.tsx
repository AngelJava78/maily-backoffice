import { configure, screen, waitFor } from '@testing-library/react';
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

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function open(url = '/roles') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const nameField = () => screen.findByLabelText(text.detail.fields.name);
const newRoleButton = () => screen.findByRole('button', { name: text.newRole });
const createButton = () => screen.getByRole('button', { name: text.form.create });

async function pickType(user: ReturnType<typeof open>['user'], label: string) {
  await user.click(screen.getByLabelText(text.detail.fields.type));
  await user.click(screen.getByRole('option', { name: label }));
}

describe('Roles y permisos: create a role (feature 014, user story 2)', { timeout: 30_000 }, () => {
  it('US2-1: creates a role with name and type alone, with no permissions', async () => {
    start();
    const { user } = open();

    await user.click(await newRoleButton());
    await user.type(await nameField(), 'Soporte Nivel 2');
    await pickType(user, text.tabs.sistema);
    await user.click(createButton());

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // Selected right after creating (T077): its own detail is already on screen.
    expect(await screen.findByDisplayValue('Soporte Nivel 2')).toBeInTheDocument();
    expect(screen.getByText(text.detail.permissionsCount(0, 16))).toBeInTheDocument();
  });

  it('US2-2: creates a role copying the permissions of another of the same type', async () => {
    start();
    const { user } = open();

    await user.click(await newRoleButton());
    await user.type(await nameField(), 'Soporte Nivel 2');
    await pickType(user, text.tabs.sistema);
    await user.click(screen.getByLabelText(text.form.copyFrom));
    await user.click(await screen.findByRole('option', { name: 'Administrator' }));
    await user.click(createButton());

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByDisplayValue('Soporte Nivel 2')).toBeInTheDocument();
    expect(screen.getByText(text.detail.permissionsCount(16, 16))).toBeInTheDocument();
  });

  it('US2-3: "Copiar permisos de" only offers roles of the chosen type', async () => {
    start();
    const { user } = open();

    await user.click(await newRoleButton());
    await pickType(user, text.tabs.clinica);
    await user.click(screen.getByLabelText(text.form.copyFrom));

    expect(screen.getByRole('option', { name: 'Owner' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Administrator' })).not.toBeInTheDocument();
  });

  it('US2-4: an empty name blocks the submission', async () => {
    const { roles } = start();
    const { user } = open();

    await user.click(await newRoleButton());
    await pickType(user, text.tabs.sistema);
    await user.click(createButton());

    expect(await screen.findByText(messages.roles.validation.nameRequired)).toBeInTheDocument();
    expect(roles.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  });

  it('US2-5: a name already used by another role (of any type) is rejected with a message', async () => {
    start();
    const { user } = open();

    await user.click(await newRoleButton());
    await user.type(await nameField(), 'Owner');
    await pickType(user, text.tabs.sistema);
    await user.click(createButton());

    expect(await screen.findByText(text.errors.nameAlreadyExists)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('US2-6: Cancelar creates nothing', async () => {
    const { roles } = start();
    const { user } = open();

    await user.click(await newRoleButton());
    await user.type(await nameField(), 'Soporte Nivel 2');
    await user.click(screen.getByRole('button', { name: text.form.cancel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(roles.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
    expect(screen.queryByText('Soporte Nivel 2')).not.toBeInTheDocument();
  });

  it('US2-7: the created role appears in its tab and opens like any other role', async () => {
    start();
    const { user } = open();

    await user.click(await newRoleButton());
    await user.type(await nameField(), 'Soporte Nivel 2');
    await pickType(user, text.tabs.sistema);
    await user.click(createButton());
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Pick a different role and back, to prove it is really in the list, not only just-opened.
    await user.click(screen.getByText('Administrator'));
    await user.click(screen.getByText('Soporte Nivel 2'));

    expect(await screen.findByDisplayValue('Soporte Nivel 2')).toBeInTheDocument();
  });
});
