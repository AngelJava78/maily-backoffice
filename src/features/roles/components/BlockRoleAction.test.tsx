import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { BlockRoleAction } from './BlockRoleAction';

const ADMIN_SUB = 'auth0|roles-admin';
const text = messages.roles.status;
const DEVELOPER = { id: 2, name: 'Developer' };

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function renderAction({ disabled = false } = {}) {
  const onBlocked = vi.fn<() => void>();
  const result = renderWithProviders(
    <BlockRoleAction role={DEVELOPER} disabled={disabled} onBlocked={onBlocked} />,
    { auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } },
  );
  return { ...result, onBlocked };
}

const blockRequests = (roles: ReturnType<typeof start>['roles']) =>
  roles.requests.filter((request) => request.path === '/api/v1/roles/2/block');

async function openConfirmation(user: ReturnType<typeof renderAction>['user']) {
  await user.click(screen.getByRole('button', { name: text.block }));
  return screen.findByRole('dialog', { name: text.confirmTitle('Developer') });
}

describe('BlockRoleAction', () => {
  it('asks for a confirmation that names the role and its consequences (US3-3, FR-013)', async () => {
    const { roles } = start();
    const { user } = renderAction();

    const dialog = await openConfirmation(user);

    expect(dialog).toHaveAccessibleDescription(text.confirmBody('Developer'));
    expect(within(dialog).getByRole('button', { name: text.cancel })).toHaveFocus();
    expect(blockRequests(roles)).toHaveLength(0);
  });

  it('confirming blocks the role, tells it, closes and calls onBlocked (US3-4)', async () => {
    const { users } = start();
    const { user, onBlocked } = renderAction();

    const dialog = await openConfirmation(user);
    await user.click(within(dialog).getByRole('button', { name: text.confirm }));

    await waitFor(() => {
      expect(onBlocked).toHaveBeenCalledOnce();
    });
    expect(users.state.findRole(2)?.statusId).toBe(2);
    expect(await screen.findByText(text.blocked('Developer'))).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('cancelling changes nothing and gives the focus back to "Bloquear role" (US3-5, US5-3)', async () => {
    const { roles } = start();
    const { user, onBlocked } = renderAction();

    const dialog = await openConfirmation(user);
    await user.click(within(dialog).getByRole('button', { name: text.cancel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: text.block })).toHaveFocus();
    expect(blockRequests(roles)).toHaveLength(0);
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it('while blocking, the dialog shows the work and cannot be left (US3-9, FR-016)', async () => {
    const { roles } = start();
    const release = roles.defer();
    const { user } = renderAction();

    const dialog = await openConfirmation(user);
    await user.click(within(dialog).getByRole('button', { name: text.confirm }));

    expect(within(dialog).getByRole('button', { name: text.cancel })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    release();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('a role someone else already blocked is told as information and still calls onBlocked (US3-10)', async () => {
    const { users } = start();
    const { user, onBlocked } = renderAction();
    const dialog = await openConfirmation(user);
    users.setRoleStatus(2, 2);

    await user.click(within(dialog).getByRole('button', { name: text.confirm }));

    expect(await screen.findByText(text.alreadyBlocked('Developer'))).toBeInTheDocument();
    expect(onBlocked).toHaveBeenCalledOnce();
  });

  it('any other failure is an error, leaves the role as it was and does not call onBlocked (US3-11)', async () => {
    const { users, roles } = start();
    roles.failNext({
      method: 'POST',
      path: '/api/v1/roles/2/block',
      status: 500,
      code: 'internal_error',
    });
    const { user, onBlocked } = renderAction();

    const dialog = await openConfirmation(user);
    await user.click(within(dialog).getByRole('button', { name: text.confirm }));

    expect(await screen.findByText(messages.roles.errors.retryable)).toBeInTheDocument();
    expect(users.state.findRole(2)?.statusId).toBe(1);
    expect(onBlocked).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: text.block })).toBeEnabled();
  });

  it('is disabled while the detail has unsaved changes (US3-2)', () => {
    start();
    renderAction({ disabled: true });

    expect(screen.getByRole('button', { name: text.block })).toBeDisabled();
  });
});
