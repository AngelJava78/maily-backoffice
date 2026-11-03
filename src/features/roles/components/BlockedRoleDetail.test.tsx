import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { Role } from '../schemas/role';
import { BlockedRoleDetail } from './BlockedRoleDetail';

const ADMIN_SUB = 'auth0|roles-admin';
const BLOCKED = 2;
const text = messages.roles;

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  users.setRoleStatus(7, BLOCKED);
  return { users, roles };
}

const DOCTOR: Role = {
  id: 7,
  name: 'Doctor',
  description: 'Atiende a los pacientes.',
  createdAt: '2026-10-15T05:57:30.521Z',
  status: { id: BLOCKED, name: 'Bloqueado' },
  type: { id: 2, name: 'Clínica' },
};

function renderDetail({ role = DOCTOR, canUnblock = true } = {}) {
  const onUnblocked = vi.fn<() => void>();
  const result = renderWithProviders(
    <BlockedRoleDetail role={role} canUnblock={canUnblock} onUnblocked={onUnblocked} />,
    { auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } },
  );
  return { ...result, onUnblocked };
}

describe('BlockedRoleDetail', () => {
  it('shows the name, description, type, that it is blocked and why (US2-4, FR-012)', () => {
    start();

    renderDetail();

    expect(screen.getByRole('heading', { name: 'Doctor', level: 2 })).toBeVisible();
    expect(screen.getByText('Atiende a los pacientes.')).toBeVisible();
    expect(screen.getByText(`${text.detail.fields.type}: Clínica`)).toBeVisible();
    expect(
      screen.getByText(`${text.blocked.statusLabel}: ${text.blocked.statusValue}`),
    ).toBeVisible();
    expect(screen.getByText(text.blocked.explanation)).toBeVisible();
  });

  it('offers no permissions, no fields and no save, duplicate or delete action (FR-012, FR-017)', () => {
    const { roles } = start();

    renderDetail();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    for (const name of [
      text.detail.save,
      text.detail.discard,
      text.detail.duplicate,
      text.delete.action,
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(roles.requests).toEqual([]);
  });

  it('a role without a description shows no empty line for it', () => {
    start();

    const { container } = renderDetail({ role: { ...DOCTOR, description: null } });

    const paragraphs = [...container.querySelectorAll('p')].map((element) => element.textContent);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs).not.toContain('');
  });

  it('offers "Desbloquear role" only to who can edit roles (US3-6)', () => {
    start();

    renderDetail({ canUnblock: false });

    expect(screen.queryByRole('button', { name: text.status.unblock })).not.toBeInTheDocument();
  });

  it('"Desbloquear role" acts at once, without a confirmation, and calls onUnblocked (US3-7)', async () => {
    const { users } = start();
    const { user, onUnblocked } = renderDetail();

    await user.click(screen.getByRole('button', { name: text.status.unblock }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(onUnblocked).toHaveBeenCalledOnce();
    });
    expect(users.state.findRole(7)?.statusId).toBe(1);
    expect(await screen.findByText(text.status.unblocked('Doctor'))).toBeInTheDocument();
  });

  it('while unblocking, the button takes no second press (US3-9)', async () => {
    const { roles } = start();
    const release = roles.defer();
    const { user } = renderDetail();

    await user.click(screen.getByRole('button', { name: text.status.unblock }));

    expect(screen.getByRole('button', { name: text.status.unblock })).toBeDisabled();
    release();
    await waitFor(() => {
      expect(
        roles.requests.filter((request) => request.path === '/api/v1/roles/7/unblock'),
      ).toHaveLength(1);
    });
  });

  it('a role already active is told as information (US3-10)', async () => {
    const { users } = start();
    users.setRoleStatus(7, 1);
    const { user, onUnblocked } = renderDetail();

    await user.click(screen.getByRole('button', { name: text.status.unblock }));

    expect(await screen.findByText(text.status.alreadyActive('Doctor'))).toBeInTheDocument();
    expect(onUnblocked).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    start();
    const { container } = renderDetail();

    expect(await axe(container)).toHaveNoViolations();
  });
});
