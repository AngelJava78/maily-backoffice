import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { userDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { platformUserSchema } from '../schemas/user';
import { UserSearchResult } from './UserSearchResult';

function renderResult(statusId = 1, statusName = 'Activo') {
  const user = platformUserSchema.parse(userDto({ status: { id: statusId, name: statusName } }));
  return renderWithProviders(
    <UserSearchResult user={user} listSearch="?email=ana%40clinica.com" />,
  );
}

describe('UserSearchResult', () => {
  it('shows the full name, the email, the status and the date of creation', () => {
    renderResult();

    expect(screen.getByText('Ana Pérez Gómez')).toBeInTheDocument();
    expect(screen.getByText('ana@clinica.com')).toBeInTheDocument();
    expect(screen.getByText(messages.users.status.active)).toBeInTheDocument();
    expect(screen.getByText(formatDateTime('2026-10-15T14:20:11.032Z'))).toBeInTheDocument();
  });

  it.each([
    [2, 'Bloqueado', messages.users.status.blocked],
    [3, 'Eliminado', messages.users.status.deleted],
  ])('shows the user whatever its status: %s', (id, name, text) => {
    renderResult(id, name);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('links to the detail, carrying the search to come back to it', async () => {
    const { user, router } = renderResult();
    const link = screen.getByRole('link', { name: new RegExp(messages.users.search.viewDetail) });
    expect(link).toHaveAttribute('href', '/users/121');

    await user.click(link);

    expect(router.state.location.pathname).toBe('/users/121');
    expect(router.state.location.state).toEqual({ listSearch: '?email=ana%40clinica.com' });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderResult(2, 'Bloqueado');

    expect(await axe(container)).toHaveNoViolations();
  });
});
