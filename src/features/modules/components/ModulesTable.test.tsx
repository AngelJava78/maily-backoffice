import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import { ModulesTable } from './ModulesTable';

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 1,
    key: 'inventory',
    name: 'Inventario',
    description: null,
    sortOrder: 10,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 2,
    actions: new Set(['read', 'update']),
    permissionIdByAction: new Map([
      ['read', 1],
      ['update', 2],
    ]),
    ...overrides,
  };
}

describe('ModulesTable', () => {
  it('groups Sistema first and Clínica after, each with its count', () => {
    render(
      <ModulesTable
        modules={[
          module({ id: 1, key: 'users', name: 'Usuarios', typeId: MODULE_TYPE.SYSTEM }),
          module({
            id: 2,
            key: 'appointments',
            name: 'Agenda y citas',
            typeId: MODULE_TYPE.CLINIC,
          }),
        ]}
        canEdit
        onEdit={vi.fn()}
      />,
    );

    const headings = screen.getAllByRole('rowheader', { name: /Sistema|Clínica/ });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Sistema, pantallas del Backoffice · 1 módulos',
      'Clínica, aplicación para clínicas · 1 módulos',
    ]);
  });

  it('shows only the groups that have modules', () => {
    render(
      <ModulesTable modules={[module({ typeId: MODULE_TYPE.CLINIC })]} canEdit onEdit={vi.fn()} />,
    );

    expect(screen.queryByText(/Sistema, pantallas del Backoffice/)).not.toBeInTheDocument();
    expect(screen.getByText(/Clínica, aplicación para clínicas/)).toBeInTheDocument();
  });

  it('shows order, module, key, type and only the actions the module has, in order', () => {
    render(
      <ModulesTable
        modules={[
          module({
            name: 'Agenda y citas',
            key: 'appointments',
            sortOrder: 20,
            actions: new Set(['read', 'write']),
          }),
        ]}
        canEdit
        onEdit={vi.fn()}
      />,
    );

    const row = screen.getByRole('row', { name: /Agenda y citas/ });
    expect(within(row).getByText('20')).toBeInTheDocument();
    expect(within(row).getByText('appointments')).toBeInTheDocument();
    expect(within(row).getByText('Clínica')).toBeInTheDocument();
    expect(within(row).getByText('Ver')).toBeInTheDocument();
    expect(within(row).getByText('Crear')).toBeInTheDocument();
    expect(within(row).queryByText('Modificar')).not.toBeInTheDocument();
    expect(within(row).queryByText('Eliminar')).not.toBeInTheDocument();
  });

  it('marks the protected modules as Base', () => {
    render(
      <ModulesTable
        modules={[module({ key: 'users', name: 'Usuarios', typeId: MODULE_TYPE.SYSTEM })]}
        canEdit
        onEdit={vi.fn()}
      />,
    );

    const row = screen.getByRole('row', { name: /Usuarios/ });
    expect(within(row).getByText('Base')).toBeInTheDocument();
  });

  it('does not mark a non-protected module as Base', () => {
    render(<ModulesTable modules={[module({ key: 'inventory' })]} canEdit onEdit={vi.fn()} />);

    expect(screen.queryByText('Base')).not.toBeInTheDocument();
  });

  it('calls onEdit with the module id when Editar is pressed', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ModulesTable modules={[module({ id: 42 })]} canEdit onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: 'Editar' }));

    expect(onEdit).toHaveBeenCalledWith(42);
  });

  it('offers no Editar action without canEdit', () => {
    render(<ModulesTable modules={[module()]} canEdit={false} onEdit={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('renders nothing without modules', () => {
    const { container } = render(<ModulesTable modules={[]} canEdit onEdit={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <ModulesTable
        modules={[
          module({ id: 1, key: 'users', name: 'Usuarios', typeId: MODULE_TYPE.SYSTEM }),
          module({
            id: 2,
            key: 'appointments',
            name: 'Agenda y citas',
            typeId: MODULE_TYPE.CLINIC,
          }),
        ]}
        canEdit
        onEdit={vi.fn()}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
