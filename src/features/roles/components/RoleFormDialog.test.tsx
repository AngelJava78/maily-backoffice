import { screen, waitFor } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { Role } from '../schemas/role';
import { RoleFormDialog } from './RoleFormDialog';

const ADMIN_SUB = 'auth0|roles-admin';
const text = messages.roles;

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function renderDialog(props: Partial<ComponentProps<typeof RoleFormDialog>> = {}) {
  const onCreated = vi.fn<(role: Role) => void>();
  const onCancel = vi.fn<() => void>();
  const view = renderWithProviders(
    <RoleFormDialog open onCreated={onCreated} onCancel={onCancel} {...props} />,
    { auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } },
  );
  return { ...view, onCreated, onCancel };
}

const nameField = () => screen.findByLabelText(text.detail.fields.name);
const typeField = () => screen.getByLabelText(text.detail.fields.type);
const createButton = () => screen.getByRole('button', { name: text.form.create });

describe('RoleFormDialog', () => {
  it('shows the title and the fields of the form', async () => {
    start();
    renderDialog();

    expect(screen.getByRole('dialog', { name: text.form.createTitle })).toBeInTheDocument();
    expect(await nameField()).toBeInTheDocument();
    expect(screen.getByLabelText(text.detail.fields.description)).toBeInTheDocument();
    expect(typeField()).toBeInTheDocument();
    expect(screen.getByLabelText(text.form.copyFrom)).toBeInTheDocument();
  });

  it('requires a name, without creating anything (US2-4)', async () => {
    const { roles } = start();
    const { user, onCreated } = renderDialog();
    await nameField();

    await user.click(createButton());

    expect(await screen.findByText(messages.roles.validation.nameRequired)).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(roles.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  });

  it('requires a type to be chosen, without creating anything', async () => {
    start();
    const { user, onCreated } = renderDialog();
    await user.type(await nameField(), 'Auditor');

    await user.click(createButton());

    expect(await screen.findByText(messages.roles.validation.typeRequired)).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('creates the role with name and type alone when nothing is copied (US2-1)', async () => {
    start();
    const { user, onCreated } = renderDialog();
    await user.type(await nameField(), 'Auditor');
    await user.click(typeField());
    await user.click(screen.getByRole('option', { name: text.tabs.sistema }));

    await user.click(createButton());

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Auditor', type: { id: 1, name: 'Sistema' } }),
      );
    });
  });

  it('copies the permissions of the chosen role (US2-2)', async () => {
    const { users } = start();
    const { user, onCreated } = renderDialog();
    await user.type(await nameField(), 'Auditor');
    await user.click(typeField());
    await user.click(screen.getByRole('option', { name: text.tabs.sistema }));
    await user.click(screen.getByLabelText(text.form.copyFrom));
    await user.click(await screen.findByRole('option', { name: 'Administrator' }));

    await user.click(createButton());

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
    const created = onCreated.mock.calls[0]?.[0];
    expect(created).toBeDefined();
    const createdDirectoryRole =
      created === undefined ? undefined : users.state.findRole(created.id);
    expect(createdDirectoryRole?.permissions).toHaveLength(16);
  });

  it('clears the chosen "copiar permisos de" role when the type changes (FR-006)', async () => {
    start();
    const { user } = renderDialog();
    await user.click(typeField());
    await user.click(screen.getByRole('option', { name: text.tabs.sistema }));
    await user.click(screen.getByLabelText(text.form.copyFrom));
    await user.click(await screen.findByRole('option', { name: 'Administrator' }));
    expect(screen.getByLabelText(text.form.copyFrom)).toHaveValue('Administrator');

    await user.click(typeField());
    await user.click(screen.getByRole('option', { name: text.tabs.clinica }));

    expect(screen.getByLabelText(text.form.copyFrom)).toHaveValue('');
  });

  it('keeps the dialog open and the typed values when the name is already taken', async () => {
    start();
    const { user, onCreated } = renderDialog();
    await user.type(await nameField(), 'Administrator');
    await user.click(typeField());
    await user.click(screen.getByRole('option', { name: text.tabs.sistema }));

    await user.click(createButton());

    expect(await screen.findByText(text.errors.nameAlreadyExists)).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(await nameField()).toHaveValue('Administrator');
  });

  it('Cancelar closes without creating anything', async () => {
    start();
    const { user, onCreated, onCancel } = renderDialog();
    await user.type(await nameField(), 'Auditor');

    await user.click(screen.getByRole('button', { name: text.form.cancel }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('disables "Crear role" while the creation is pending', async () => {
    const { roles } = start();
    const { user } = renderDialog();
    await user.type(await nameField(), 'Auditor');
    await user.click(typeField());
    await user.click(screen.getByRole('option', { name: text.tabs.sistema }));

    roles.defer();
    await user.click(createButton());

    await waitFor(() => {
      expect(createButton()).toBeDisabled();
    });
  });
});
