import { configure, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  ADMIN_SUB,
  createRolesCatalogMock,
  rolesCatalogScenario,
} from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { uuidOf } from '@/test/ids';
import { renderApp } from '@/test/renderApp';

beforeAll(() => {
  configure({ asyncUtilTimeout: 10_000 });
});

const text = messages.roles;

function start() {
  const scenario = rolesCatalogScenario();
  // Billing (role 5) is also assigned to a second person, to prove deleting is not blocked by that
  // (edge case of spec.md, confirmed against role_service.py's soft delete).
  const users = createUsersDirectoryMock({
    ...scenario.directory,
    associations: [...scenario.directory.associations, { userId: uuidOf(2), roleId: 5 }],
  });
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function open(url = '/roles?type=sistema&roleId=5') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

describe('Roles y permisos: delete a role (feature 014, user story 3)', { timeout: 30_000 }, () => {
  it('US3-1, US3-2: confirming, after the warning, removes the role from the list (FR-015)', async () => {
    start();
    const { user, router } = open();
    await screen.findByDisplayValue('Billing');

    await user.click(screen.getByRole('button', { name: text.delete.action }));
    const dialog = await screen.findByRole('dialog', {
      name: text.delete.confirmTitle('Billing'),
    });
    expect(dialog).toHaveAccessibleDescription(text.delete.confirmBody);
    await user.click(screen.getByRole('button', { name: text.delete.confirm }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Billing')).not.toBeInTheDocument();
    expect(router.state.location.search).not.toContain('roleId');
    // Deleting was not blocked by the second person still assigned to it.
    expect(await screen.findByText(messages.roles.detail.emptySelection)).toBeInTheDocument();
  });

  it('US3-3: closing the confirmation without confirming deletes nothing', async () => {
    const { roles } = start();
    const { user } = open();
    await screen.findByDisplayValue('Billing');

    await user.click(screen.getByRole('button', { name: text.delete.action }));
    await screen.findByRole('dialog', { name: text.delete.confirmTitle('Billing') });
    await user.click(screen.getByRole('button', { name: text.delete.cancel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Billing')).toBeInTheDocument();
    expect(roles.requests.filter((request) => request.method === 'DELETE')).toHaveLength(0);
  });
});
