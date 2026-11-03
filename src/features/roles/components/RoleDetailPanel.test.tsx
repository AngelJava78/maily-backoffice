import { screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Ver de Roles', pressed: true })).toBeInTheDocument();
  });

  it('lists the permissions under a name that carries the role (FR-001, FR-014)', async () => {
    start();

    renderPanel(1);

    await screen.findByLabelText(text.fields.name);
    expect(
      screen.getByRole('list', { name: text.matrixTitle('Administrator') }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
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
    const { users } = start();
    const { user } = renderPanel(2);

    await screen.findByLabelText(text.fields.name);
    expect(screen.getByText(text.permissionsCount(0, 16))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver de Roles' }));
    expect(screen.getByRole('button', { name: text.save })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: text.save }));

    // While it saves, the screen still shows the pending change: wait until it is done.
    expect(await screen.findByText(text.saved)).toBeInTheDocument();
    expect(users.state.findRole(2)?.permissions).toEqual(['roles:read']);
    expect(screen.getByText(text.permissionsCount(1, 16))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver de Roles' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
  });

  it('pressing a button and pressing it again leaves no pending change (US2-4)', async () => {
    start();
    const { user } = renderPanel(2);

    await screen.findByLabelText(text.fields.name);
    await user.click(screen.getByRole('button', { name: 'Ver de Roles' }));
    expect(screen.getByRole('button', { name: text.save })).toBeEnabled();
    expect(screen.getByRole('button', { name: text.discard })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Ver de Roles' }));

    expect(
      screen.getByRole('button', { name: 'Ver de Roles', pressed: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
    expect(screen.getByRole('button', { name: text.discard })).toBeDisabled();
  });

  it('a Clínica role can grant and save a Sistema module permission (asymmetric rule, FR-001)', async () => {
    const { users } = start();
    const { user } = renderPanel(6);

    await screen.findByLabelText(text.fields.name);
    expect(screen.getByText(text.permissionsCount(0, 16))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver de Roles' }));
    expect(screen.getByRole('button', { name: text.save })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: text.save }));

    // While it saves, the screen still shows the pending change: wait until it is done, so that
    // what is checked is what the service kept (spec 015 of the users API), not the change.
    expect(await screen.findByText(text.saved)).toBeInTheDocument();
    expect(users.state.findRole(6)?.permissions).toEqual(['roles:read']);
    expect(screen.getByText(text.permissionsCount(1, 16))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver de Roles' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
    expect(screen.queryByText(messages.roles.errors.saveIncomplete(1))).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Ver de Roles' })).not.toBeInTheDocument();
  });

  describe('capabilities', () => {
    it('disables the fields, the matrix and "Guardar cambios" without canEdit', async () => {
      start();
      renderPanel(2, { canCreate: false, canEdit: false, canDelete: false });

      expect(await screen.findByLabelText(text.fields.name)).toBeDisabled();
      expect(screen.getByLabelText(text.fields.description)).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Ver de Roles' })).toBeDisabled();
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
    /** Stands in for `RoleDetailPage`: opens whatever role `onDuplicated` reports. */
    function SelectsOnDuplicate({ initialRoleId }: { readonly initialRoleId: number }) {
      const [openRoleId, setOpenRoleId] = useState(initialRoleId);
      return (
        <RoleDetailPanel
          roleId={openRoleId}
          capabilities={FULL_CAPABILITIES}
          onDuplicated={(role: Role) => {
            setOpenRoleId(role.id);
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
    it('opens the confirmation naming the role, deletes it and tells the screen (FR-015, research D8)', async () => {
      const { roles } = start();
      const onDeleted = vi.fn<() => void>();
      const { user } = renderWithProviders(
        <RoleDetailPanel roleId={5} capabilities={FULL_CAPABILITIES} onDeleted={onDeleted} />,
        { auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } },
      );
      await screen.findByLabelText(text.fields.name);

      await user.click(screen.getByRole('button', { name: messages.roles.delete.action }));
      const dialog = await screen.findByRole('dialog', {
        name: messages.roles.delete.confirmTitle('Billing'),
      });
      await user.click(screen.getByRole('button', { name: messages.roles.delete.confirm }));

      await waitFor(() => {
        expect(dialog).not.toBeInTheDocument();
      });
      expect(onDeleted).toHaveBeenCalledTimes(1);
      expect(roles.requests.filter((request) => request.method === 'DELETE')).toHaveLength(1);
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

  describe('"Bloquear role" (feature 025, US3)', () => {
    it('is offered with canEdit, after "Duplicar" and before "Eliminar role" (US3-1)', async () => {
      start();
      renderPanel(2);
      await screen.findByDisplayValue('Developer');

      const wanted: readonly string[] = [
        text.duplicate,
        messages.roles.status.block,
        messages.roles.delete.action,
      ];
      const names = screen
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter((name) => wanted.includes(name));
      expect(names).toEqual([
        text.duplicate,
        messages.roles.status.block,
        messages.roles.delete.action,
      ]);
    });

    it('is not offered without canEdit (US3-1, SC-007)', async () => {
      start();
      renderPanel(2, { canCreate: true, canEdit: false, canDelete: true });
      await screen.findByDisplayValue('Developer');

      expect(
        screen.queryByRole('button', { name: messages.roles.status.block }),
      ).not.toBeInTheDocument();
    });

    it('is not available while there are unsaved changes (US3-2, FR-013)', async () => {
      start();
      const { user } = renderPanel(2);
      const nameField = await screen.findByDisplayValue('Developer');
      expect(screen.getByRole('button', { name: messages.roles.status.block })).toBeEnabled();

      await user.type(nameField, ' Jr');

      expect(screen.getByRole('button', { name: messages.roles.status.block })).toBeDisabled();
    });

    it('confirming blocks the role and calls onBlocked', async () => {
      const { users } = start();
      const onBlocked = vi.fn<() => void>();
      const { user } = renderWithProviders(
        <RoleDetailPanel roleId={2} capabilities={FULL_CAPABILITIES} onBlocked={onBlocked} />,
        { auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } },
      );
      await screen.findByDisplayValue('Developer');

      await user.click(screen.getByRole('button', { name: messages.roles.status.block }));
      const dialog = await screen.findByRole('dialog', {
        name: messages.roles.status.confirmTitle('Developer'),
      });
      await user.click(within(dialog).getByRole('button', { name: messages.roles.status.confirm }));

      await waitFor(() => {
        expect(onBlocked).toHaveBeenCalledOnce();
      });
      expect(users.state.findRole(2)?.statusId).toBe(2);
    });
  });
});
