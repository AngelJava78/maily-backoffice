import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { userListItemDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { userListItemSchema, type UserListItem } from '../schemas/userListItem';
import { UsersGrid } from './UsersGrid';
import { uuidOf } from '@/test/ids';

const SYSTEM = { id: 1, name: 'Sistema' };
const CLINIC = { id: 2, name: 'Clínica' };

/** Ten active users: the first of Sistema, the second of Clínica, the third of both, the rest of none. */
function tenUsers(): UserListItem[] {
  const types = [[SYSTEM], [CLINIC], [SYSTEM, CLINIC]];
  return Array.from({ length: 10 }, (_, index) =>
    userListItemSchema.parse(
      userListItemDto(
        {
          id: uuidOf(121 + index),
          email: `usuario${index}@clinica.com`,
          first_name: `Usuario${index}`,
          paternal_last_name: 'Pérez',
          maternal_last_name: index === 1 ? null : 'Gómez',
        },
        types[index] ?? [],
      ),
    ),
  );
}

function renderGrid(props: Partial<Parameters<typeof UsersGrid>[0]> = {}) {
  const onPaginationChange = vi.fn<(page: number, pageSize: number) => void>();
  const view = renderWithProviders(
    <UsersGrid
      users={tenUsers()}
      total={120}
      page={1}
      pageSize={10}
      loading={false}
      listSearch="?page=3&page_size=25"
      emptyMessage={messages.users.list.empty}
      onPaginationChange={onPaginationChange}
      {...props}
    />,
  );
  return { ...view, onPaginationChange };
}

/** The closest element around `element` that matches `selector`; the test fails if there is none. */
function around(element: HTMLElement, selector: string): HTMLElement {
  const found = element.closest<HTMLElement>(selector);
  if (found === null) {
    throw new Error(`No ${selector} around the element`);
  }
  return found;
}

describe('UsersGrid', () => {
  it('shows the name, the email, the type and the date of creation of each user (FR-006)', () => {
    renderGrid();

    const grid = screen.getByRole('grid', { name: messages.users.list.gridLabel });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      messages.users.list.columns.name,
      messages.users.list.columns.email,
      messages.users.list.columns.type,
      messages.users.list.columns.createdAt,
    ]);
    expect(within(grid).getByText('usuario0@clinica.com')).toBeInTheDocument();
    expect(within(grid).getAllByText(formatDateTime('2026-10-15T14:20:11.032Z'))).toHaveLength(10);
  });

  it('shows the full name, with the maternal last name only if the user has one', () => {
    renderGrid();

    expect(screen.getByRole('link', { name: 'Usuario0 Pérez Gómez' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuario1 Pérez' })).toBeInTheDocument();
  });

  it('shows the type of each user with the words of the buttons, and «—» without active roles (FR-006)', () => {
    renderGrid();

    const rowOf = (name: string) => around(screen.getByRole('link', { name }), '[role="row"]');
    expect(within(rowOf('Usuario0 Pérez Gómez')).getByText('Sistema')).toBeInTheDocument();
    expect(within(rowOf('Usuario1 Pérez')).getByText('Clínica')).toBeInTheDocument();
    expect(
      within(rowOf('Usuario2 Pérez Gómez')).getByText('Sistema y Clínica'),
    ).toBeInTheDocument();
    expect(within(rowOf('Usuario3 Pérez Gómez')).getByText('—')).toBeInTheDocument();
  });

  it('marks a blocked user next to its name, and an active one not (FR-006, US2-3)', () => {
    const blocked = userListItemSchema.parse(
      userListItemDto(
        {
          id: uuidOf(300),
          first_name: 'Gabi',
          paternal_last_name: 'López',
          maternal_last_name: null,
          status: { id: 2, name: 'Bloqueado' },
        },
        [CLINIC],
      ),
    );
    renderGrid({ users: [blocked, ...tenUsers().slice(0, 1)], total: 2 });

    const nameCell = (name: string) =>
      around(screen.getByRole('link', { name }), '[role="gridcell"]');
    expect(within(nameCell('Gabi López')).getByText(messages.users.status.blocked)).toBeVisible();
    expect(
      within(nameCell('Usuario0 Pérez Gómez')).queryByText(messages.users.status.active),
    ).toBeNull();
    // The name is still the link to the detail.
    expect(screen.getByRole('link', { name: 'Gabi López' })).toHaveAttribute(
      'href',
      '/users/' + uuidOf(300),
    );
  });

  it('does not show the roles of the users', () => {
    renderGrid();

    expect(screen.queryByRole('columnheader', { name: /roles?/i })).not.toBeInTheDocument();
  });

  it('links the name to the detail, carrying the search of the list to come back to it (US1-4)', async () => {
    const { user, router } = renderGrid();
    const link = screen.getByRole('link', { name: 'Usuario0 Pérez Gómez' });
    expect(link).toHaveAttribute('href', `/users/${uuidOf(121)}`);

    await user.click(link);

    expect(router.state.location.pathname).toBe(`/users/${uuidOf(121)}`);
    expect(router.state.location.state).toEqual({ listSearch: '?page=3&page_size=25' });
  });

  it('has the footer in Spanish with the total of the service', () => {
    renderGrid();

    expect(screen.getByText(/filas por página/i)).toBeInTheDocument();
    expect(screen.getByText('1–10 de 120')).toBeInTheDocument();
  });

  it('asks for the next page, counting from 1 outside the grid', async () => {
    const { user, onPaginationChange } = renderGrid();

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

    expect(onPaginationChange).toHaveBeenCalledWith(2, 10);
  });

  it('offers 10, 25 and 50 users per page, and asking for 25 goes back to the first page', async () => {
    const { user, onPaginationChange } = renderGrid();

    await user.click(screen.getByLabelText(/filas por página/i));
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['10', '25', '50']);
    await user.click(screen.getByRole('option', { name: '25' }));

    expect(onPaginationChange).toHaveBeenCalledWith(1, 25);
  });

  it('indicates that it is loading', () => {
    renderGrid({ loading: true });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the empty state with the message and the action it is given when there are no users', () => {
    renderGrid({
      users: [],
      total: 0,
      emptyMessage: 'No hay usuarios activos de Sistema',
      emptyAction: <button type="button">Crear usuario</button>,
    });

    expect(screen.getByText('No hay usuarios activos de Sistema')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear usuario' })).toBeInTheDocument();
  });

  it('shows the empty state alone when it has no action to offer', () => {
    renderGrid({ users: [], total: 0 });

    expect(screen.getByText(messages.users.list.empty)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear usuario' })).not.toBeInTheDocument();
  });

  it('neither sorts nor filters: the service gives a fixed order', async () => {
    const { user } = renderGrid();
    const header = screen.getByRole('columnheader', {
      name: messages.users.list.columns.email,
    });
    const namesBefore = screen.getAllByRole('link').map((link) => link.textContent);
    const sortBefore = header.getAttribute('aria-sort');

    await user.click(header);
    await user.click(header);

    expect(header.getAttribute('aria-sort')).toBe(sortBefore);
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(namesBefore);
    expect(screen.queryByRole('button', { name: /menú|ordenar/i })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderGrid();

    expect(await axe(container)).toHaveNoViolations();
  });
});
