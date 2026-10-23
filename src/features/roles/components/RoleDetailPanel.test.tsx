import { screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { Role } from '../schemas/role';
import { RoleDetailPanel } from './RoleDetailPanel';

const ADMIN_SUB = 'auth0|roles-admin';
const text = messages.roles.detail;
const FULL_CAPABILITIES = { canCreate: true, canEdit: true, canDelete: true };

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function renderPanel(roleId: number, capabilities = FULL_CAPABILITIES) {
  return renderWithProviders(<RoleDetailPanel roleId={roleId} capabilities={capabilities} />, {
    auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) },
  });
}

describe('RoleDetailPanel', () => {
  it('shows name, description, type as text, the counter and the matrix (FR-005)', async () => {
    start();

    renderPanel(1);

    expect(await screen.findByLabelText(text.fields.name)).toHaveValue('Administrator');
    expect(screen.getByLabelText(text.fields.description)).toHaveValue('');
    expect(screen.getByText(`${text.fields.type}: Sistema`)).toBeInTheDocument();
    expect(screen.getByText(text.permissionsCount(16, 16))).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Ver de Roles' })).toBeChecked();
  });

  it('starts with Guardar/Descartar disabled, and enables them once the name changes', async () => {
    start();
    const { user } = renderPanel(2);

    const nameField = await screen.findByLabelText(text.fields.name);
    expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
    expect(screen.getByRole('button', { name: text.discard })).toBeDisabled();

    await user.type(nameField, ' Jr');

    expect(screen.getByRole('button', { name: text.save })).toBeEnabled();
    expect(screen.getByRole('button', { name: text.discard })).toBeEnabled();
  });

  it('Descartar cambios reverts the name and disables the buttons again', async () => {
    start();
    const { user } = renderPanel(2);

    const nameField = await screen.findByLabelText(text.fields.name);
    await user.type(nameField, ' Jr');
    await user.click(screen.getByRole('button', { name: text.discard }));

    expect(nameField).toHaveValue('Developer');
    expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
    expect(screen.getByRole('button', { name: text.discard })).toBeDisabled();
  });

  it('toggling a permission enables saving, and Guardar cambios persists it (FR-008, FR-010)', async () => {
    start();
    const { user } = renderPanel(2);

    await screen.findByLabelText(text.fields.name);
    expect(screen.getByText(text.permissionsCount(0, 16))).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Ver de Roles' }));
    expect(screen.getByRole('button', { name: text.save })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: text.save }));

    await waitFor(() => {
      expect(screen.getByText(text.permissionsCount(1, 16))).toBeInTheDocument();
    });
    expect(screen.getByRole('checkbox', { name: 'Ver de Roles' })).toBeChecked();
    expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
  });

  it('rejects an empty name and saves nothing (US1-8)', async () => {
    const { roles } = start();
    const { user } = renderPanel(2);

    const nameField = await screen.findByLabelText(text.fields.name);
    await user.clear(nameField);
    await user.click(screen.getByRole('button', { name: text.save }));

    expect(await screen.findByText(messages.roles.validation.nameRequired)).toBeInTheDocument();
    expect(roles.requests.filter((request) => request.method === 'PATCH')).toHaveLength(0);
  });

  it('FR-020: a failed permissions catalog only breaks the table, not the rest of the panel', async () => {
    const { roles } = start();
    roles.failNext({
      method: 'GET',
      path: '/api/v1/permissions',
      status: 500,
      code: 'internal_error',
    });

    renderPanel(1);

    expect(await screen.findByLabelText(text.fields.name)).toHaveValue('Administrator');
    expect(screen.getByText(text.matrixError)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Ver de Roles' })).not.toBeInTheDocument();
  });

  describe('capabilities', () => {
    it('disables the fields, the matrix and "Guardar cambios" without canEdit', async () => {
      start();
      renderPanel(2, { canCreate: false, canEdit: false, canDelete: false });

      expect(await screen.findByLabelText(text.fields.name)).toBeDisabled();
      expect(screen.getByLabelText(text.fields.description)).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: 'Ver de Roles' })).toBeDisabled();
      expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
    });

    it('does not offer "Eliminar role" without canDelete', async () => {
      start();
      renderPanel(2, { canCreate: false, canEdit: true, canDelete: false });
      await screen.findByLabelText(text.fields.name);

      expect(
        screen.queryByRole('button', { name: messages.roles.delete.action }),
      ).not.toBeInTheDocument();
    });
  });

  describe('duplicating (US4, T087)', () => {
    /** Stands in for `RolesPage`: selects whatever role `onDuplicated` reports. */
    function SelectsOnDuplicate({ initialRoleId }: { readonly initialRoleId: number }) {
      const [roleId, setRoleId] = useState(initialRoleId);
      return (
        <RoleDetailPanel
          roleId={roleId}
          capabilities={FULL_CAPABILITIES}
          onDuplicated={(role: Role) => {
            setRoleId(role.id);
          }}
        />
      );
    }

    function renderDuplicating(roleId: number) {
      return renderWithProviders(<SelectsOnDuplicate initialRoleId={roleId} />, {
        auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) },
      });
    }

    it('creates an independent copy, selects it and focuses its name field (FR-014)', async () => {
      start();
      const { user } = renderDuplicating(2);
      await screen.findByLabelText(text.fields.name);

      await user.click(screen.getByRole('button', { name: text.duplicate }));

      await waitFor(() => {
        expect(screen.getByLabelText(text.fields.name)).toHaveValue('Developer (copia)');
      });
      await waitFor(() => {
        expect(screen.getByLabelText(text.fields.name)).toHaveFocus();
      });
    });

    it('does not offer "Duplicar" without canCreate', async () => {
      start();
      renderPanel(2, { canCreate: false, canEdit: true, canDelete: false });
      await screen.findByLabelText(text.fields.name);

      expect(screen.queryByRole('button', { name: text.duplicate })).not.toBeInTheDocument();
    });

    it('tells the error and does not select anything when duplicating fails', async () => {
      const { roles } = start();
      roles.failNext({
        method: 'POST',
        path: '/api/v1/roles',
        status: 500,
        code: 'internal_error',
      });
      const onDuplicated = vi.fn<(role: Role) => void>();
      const { user } = renderWithProviders(
        <RoleDetailPanel roleId={2} capabilities={FULL_CAPABILITIES} onDuplicated={onDuplicated} />,
        { auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } },
      );
      await screen.findByLabelText(text.fields.name);

      await user.click(screen.getByRole('button', { name: text.duplicate }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: text.duplicate })).toBeEnabled();
      });
      expect(onDuplicated).not.toHaveBeenCalled();
    });
  });

  describe('deleting (US3, T083)', () => {
    it('opens the confirmation naming the role, deletes it and clears the selection (FR-015)', async () => {
      start();
      const { user, router } = renderPanel(5);
      await screen.findByLabelText(text.fields.name);

      await user.click(screen.getByRole('button', { name: messages.roles.delete.action }));
      const dialog = await screen.findByRole('dialog', {
        name: messages.roles.delete.confirmTitle('Billing'),
      });
      await user.click(screen.getByRole('button', { name: messages.roles.delete.confirm }));

      await waitFor(() => {
        expect(dialog).not.toBeInTheDocument();
      });
      expect(router.state.location.search).not.toContain('roleId');
    });

    it('closes without deleting anything when cancelled', async () => {
      const { roles } = start();
      const { user } = renderPanel(5);
      await screen.findByLabelText(text.fields.name);

      await user.click(screen.getByRole('button', { name: messages.roles.delete.action }));
      await user.click(screen.getByRole('button', { name: messages.roles.delete.cancel }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(roles.requests.filter((request) => request.method === 'DELETE')).toHaveLength(0);
    });
  });
});
