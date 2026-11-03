import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { Role } from '../schemas/role';
import { RolesGrid } from './RolesGrid';

const text = messages.roles.list;

function role(id: number, name: string, typeId: 1 | 2, statusId: 1 | 2 = 1): Role {
  return {
    id,
    name,
    description: 'Una descripción que la tabla no muestra',
    createdAt: '2026-10-15T05:57:30.521Z',
    status: { id: statusId, name: statusId === 1 ? 'Activo' : 'Bloqueado' },
    type: { id: typeId, name: typeId === 1 ? 'Sistema' : 'Clínica' },
  };
}

/** Seven active roles: Sistema, Sistema, Sistema, Clínica, Sistema, Clínica, Clínica. */
const SEVEN: readonly Role[] = [
  role(1, 'Administrator', 1),
  role(2, 'Billing', 1),
  role(3, 'Developer', 1),
  role(4, 'Doctor', 2),
  role(5, 'Marketing', 1),
  role(6, 'Owner', 2),
  role(7, 'Receptionist', 2),
];

/** The totals of permissions that are known; roles 6 and 7 have none yet (still loading or failed). */
const COUNTS: ReadonlyMap<number, number> = new Map([
  [1, 16],
  [2, 2],
  [3, 1],
  [4, 0],
  [5, 5],
]);

function renderGrid(props: Partial<Parameters<typeof RolesGrid>[0]> = {}) {
  const onPaginationChange = vi.fn<(page: number, pageSize: number) => void>();
  const view = renderWithProviders(
    <RolesGrid
      roles={SEVEN}
      permissionCounts={COUNTS}
      total={7}
      page={1}
      pageSize={10}
      loading={false}
      listSearch="?type=sistema&page=2"
      emptyMessage={text.emptyAll}
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

const rowOf = (name: string) => around(screen.getByRole('link', { name }), '[role="row"]');

describe('RolesGrid', () => {
  it('has exactly the columns Nombre, Estatus, Tipo and Permisos, in that order (FR-002)', () => {
    renderGrid();

    const grid = screen.getByRole('grid', { name: text.gridLabel });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      text.columns.name,
      text.columns.status,
      text.columns.type,
      text.columns.permissions,
    ]);
    // The description and the date of creation of a role are not columns of the table.
    expect(within(grid).queryByText('Una descripción que la tabla no muestra')).toBeNull();
    expect(within(grid).queryByText('2026-10-15T05:57:30.521Z')).toBeNull();
  });

  it('shows the status of each role with the words of the filters: Activo or Bloqueado (FR-003)', () => {
    renderGrid({
      roles: [role(1, 'Administrator', 1), role(8, 'Nurse', 2, 2)],
      total: 2,
    });

    expect(within(rowOf('Administrator')).getByText(text.status.active)).toBeInTheDocument();
    expect(within(rowOf('Nurse')).getByText(text.status.blocked)).toBeInTheDocument();
    expect(within(rowOf('Nurse')).queryByText(text.status.active)).toBeNull();
  });

  it('shows the type of each role: Sistema or Clínica (FR-003)', () => {
    renderGrid();

    expect(
      within(rowOf('Administrator')).getByText(messages.roles.filters.type.system),
    ).toBeVisible();
    expect(within(rowOf('Doctor')).getByText(messages.roles.filters.type.clinic)).toBeVisible();
  });

  it('writes the total of permissions as «n permisos», and «1 permiso» for one (FR-003)', () => {
    renderGrid();

    expect(within(rowOf('Administrator')).getByText('16 permisos')).toBeVisible();
    expect(within(rowOf('Billing')).getByText('2 permisos')).toBeVisible();
    expect(within(rowOf('Developer')).getByText('1 permiso')).toBeVisible();
    expect(within(rowOf('Doctor')).getByText('0 permisos')).toBeVisible();
  });

  it('shows «—» for the role whose total is not known: loading, failed or blocked (FR-003, US1-12)', () => {
    renderGrid();

    expect(within(rowOf('Owner')).getByText(text.noValue)).toBeVisible();
    expect(within(rowOf('Receptionist')).getByText(text.noValue)).toBeVisible();
    expect(within(rowOf('Administrator')).queryByText(text.noValue)).toBeNull();
  });

  it('links each name to the detail of the role, and only the name (FR-011)', () => {
    renderGrid();

    expect(screen.getByRole('link', { name: 'Administrator' })).toHaveAttribute('href', '/roles/1');
    expect(screen.getByRole('link', { name: 'Receptionist' })).toHaveAttribute('href', '/roles/7');
    expect(screen.getAllByRole('link')).toHaveLength(7);
  });

  it('carries the search of the table to the detail, to come back to it (research D6)', async () => {
    const { user, router } = renderGrid();

    await user.click(screen.getByRole('link', { name: 'Doctor' }));

    expect(router.state.location.pathname).toBe('/roles/4');
    expect(router.state.location.state).toEqual({ listSearch: '?type=sistema&page=2' });
  });

  it('has the footer in Spanish, with the total of roles (FR-004)', () => {
    renderGrid();

    expect(screen.getByText(/filas por página/i)).toBeInTheDocument();
    expect(screen.getByText('1–7 de 7')).toBeInTheDocument();
  });

  it('asks for the next page, counting from 1 outside the grid', async () => {
    const { user, onPaginationChange } = renderGrid({ total: 25 });

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

    expect(onPaginationChange).toHaveBeenCalledWith(2, 10);
  });

  it('offers 10, 25 and 50 roles per page, and asking for 25 goes back to the first page', async () => {
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

  it('shows the skeleton of the grid while the first roles are on their way, instead of «no roles»', () => {
    renderGrid({ roles: [], total: 0, loading: true });

    expect(document.querySelector('.MuiDataGrid-skeletonLoadingOverlay')).not.toBeNull();
    expect(screen.queryByText(text.emptyAll)).not.toBeInTheDocument();
  });

  it('shows the empty state with the message and the action it is given when there are no roles', () => {
    renderGrid({
      roles: [],
      total: 0,
      emptyMessage: text.emptySistema,
      emptyAction: <button type="button">Nuevo role</button>,
    });

    expect(screen.getByText(text.emptySistema)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo role' })).toBeInTheDocument();
  });

  it('shows the empty state alone when it has no action to offer', () => {
    renderGrid({ roles: [], total: 0, emptyMessage: text.emptyBlocked });

    expect(screen.getByText(text.emptyBlocked)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo role' })).not.toBeInTheDocument();
  });

  it('neither sorts nor filters, and has no menu of a column: the order is the one of the service (FR-005)', async () => {
    const { user } = renderGrid();
    const header = screen.getByRole('columnheader', { name: text.columns.type });
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
