import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RolesPage } from './RolesPage';

const ADMIN_SUB = 'auth0|roles-admin';
const CAPABILITIES = { canCreate: true, canEdit: true, canDelete: true };

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function renderPage(route = '/roles') {
  return renderWithProviders(<RolesPage capabilities={CAPABILITIES} />, {
    route,
    auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) },
  });
}

describe('RolesPage', () => {
  it('shows the title, the tabs, the list and the empty-selection message', async () => {
    start();

    renderPage();

    expect(screen.getByRole('heading', { name: messages.roles.title })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: messages.roles.tabs.clinica })).toBeInTheDocument();
    await screen.findByText('Owner');
    expect(screen.getByText(messages.roles.detail.emptySelection)).toBeInTheDocument();
  });

  it('reads the selected role from the URL and keeps it across a re-render', async () => {
    start();

    renderPage('/roles?type=sistema&roleId=1');

    await screen.findByText('Administrator');
    expect(screen.queryByText(messages.roles.detail.emptySelection)).not.toBeInTheDocument();
  });

  it('selecting a role from the list writes it to the URL', async () => {
    start();
    const { router, user } = renderPage('/roles?type=sistema');

    await user.click(await screen.findByText('Developer'));

    expect(router.state.location.search).toBe('?type=sistema&roleId=2');
  });
});
