import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { buildModuleTree } from '../policy/buildModuleTree';
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
    parentModule: null,
    actions: new Set(['read', 'update']),
    permissionIdByAction: new Map([
      ['read', 1],
      ['update', 2],
    ]),
    ...overrides,
  };
}

function submodule(id: number, parent: SystemModule, overrides: Partial<SystemModule> = {}) {
  return module({
    id,
    key: `sub_${id}`,
    name: `Submódulo ${id}`,
    typeId: parent.typeId,
    parentModule: { id: parent.id, key: parent.key, name: parent.name },
    ...overrides,
  });
}

type TableProps = Omit<ComponentProps<typeof ModulesTable>, 'groups'>;

function renderTable(modules: readonly SystemModule[], props: Partial<TableProps> = {}) {
  const onEdit = vi.fn();
  const onToggle = vi.fn();
  const view = render(
    <ModulesTable
      groups={buildModuleTree(modules, { type: 'all', search: '' })}
      canEdit
      onEdit={onEdit}
      collapsed={new Set()}
      onToggle={onToggle}
      searching={false}
      status="active"
      {...props}
    />,
  );
  return { ...view, onEdit, onToggle };
}

describe('ModulesTable', () => {
  it('groups Sistema first and Clínica after, each with its count', () => {
    renderTable([
      module({ id: 1, key: 'users', name: 'Usuarios', typeId: MODULE_TYPE.SYSTEM }),
      module({ id: 2, key: 'appointments', name: 'Agenda y citas', typeId: MODULE_TYPE.CLINIC }),
    ]);

    const headings = screen.getAllByRole('rowheader', { name: /Sistema|Clínica/ });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Sistema, pantallas del Backoffice · 1 módulo',
      'Clínica, aplicación para clínicas · 1 módulo',
    ]);
  });

  it('shows only the groups that have modules', () => {
    renderTable([module({ typeId: MODULE_TYPE.CLINIC })]);

    expect(screen.queryByText(/Sistema, pantallas del Backoffice/)).not.toBeInTheDocument();
    expect(screen.getByText(/Clínica, aplicación para clínicas/)).toBeInTheDocument();
  });

  it('shows order, module, key, type and only the actions the module has, in order', () => {
    renderTable([
      module({
        name: 'Agenda y citas',
        key: 'appointments',
        sortOrder: 20,
        actions: new Set(['read', 'write']),
      }),
    ]);

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
    renderTable([module({ key: 'users', name: 'Usuarios', typeId: MODULE_TYPE.SYSTEM })]);

    const row = screen.getByRole('row', { name: /Usuarios/ });
    expect(within(row).getByText('Base')).toBeInTheDocument();
  });

  it('does not mark a non-protected module as Base', () => {
    renderTable([module({ key: 'inventory' })]);

    expect(screen.queryByText('Base')).not.toBeInTheDocument();
  });

  it('calls onEdit with the module id when Editar is pressed', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderTable([module({ id: 42 })]);

    await user.click(screen.getByRole('button', { name: 'Editar' }));

    expect(onEdit).toHaveBeenCalledWith(42);
  });

  it('offers no Editar action without canEdit', () => {
    renderTable([module()], { canEdit: false });

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('renders nothing without groups', () => {
    const { container } = renderTable([]);

    expect(container).toBeEmptyDOMElement();
  });

  it('has no axe violations', async () => {
    const { container } = renderTable([
      module({ id: 1, key: 'users', name: 'Usuarios', typeId: MODULE_TYPE.SYSTEM }),
      module({ id: 2, key: 'appointments', name: 'Agenda y citas', typeId: MODULE_TYPE.CLINIC }),
    ]);

    expect(await axe(container)).toHaveNoViolations();
  });

  describe('the tree (spec 024)', () => {
    const patients = module({ id: 1, key: 'patients', name: 'Pacientes', sortOrder: 10 });
    const tree = [
      patients,
      submodule(2, patients, { name: 'Recetas', sortOrder: 1 }),
      submodule(3, patients, { name: 'Vitales', sortOrder: 2 }),
      module({ id: 4, key: 'inventory', name: 'Inventario', sortOrder: 20 }),
    ];

    it('puts each submodule right under its parent', () => {
      renderTable(tree);

      const names = screen
        .getAllByRole('row')
        .map((row) => row.textContent)
        .filter((content) => /Pacientes|Recetas|Vitales|Inventario/.test(content));
      expect(names[0]).toMatch(/Pacientes/);
      expect(names[1]).toMatch(/Recetas/);
      expect(names[2]).toMatch(/Vitales/);
      expect(names[3]).toMatch(/Inventario/);
    });

    it('tells the modules and the submodules apart in the heading of the group', () => {
      renderTable(tree);

      expect(screen.getByRole('rowheader')).toHaveTextContent(
        'Clínica, aplicación para clínicas · 2 módulos y 2 submódulos',
      );
    });

    it('does not paint the submodules of a collapsed parent, and nothing else', () => {
      renderTable(tree, { collapsed: new Set([1]) });

      expect(screen.queryByText('Recetas')).not.toBeInTheDocument();
      expect(screen.queryByText('Vitales')).not.toBeInTheDocument();
      expect(screen.getByText('Pacientes')).toBeVisible();
      expect(screen.getByText('Inventario')).toBeVisible();
    });

    it('paints everything while a search is active, whatever is collapsed', () => {
      renderTable(tree, { collapsed: new Set([1]), searching: true });

      expect(screen.getByText('Recetas')).toBeVisible();
      expect(
        screen.queryByRole('button', { name: /submódulos de Pacientes/ }),
      ).not.toBeInTheDocument();
    });

    it('asks to collapse a parent with the control of its row', async () => {
      const user = userEvent.setup();
      const { onToggle } = renderTable(tree);

      await user.click(screen.getByRole('button', { name: '2 submódulos de Pacientes' }));

      expect(onToggle).toHaveBeenCalledWith(1);
    });

    it('paints a context row, dimmed and without actions, for a parent that is in another view', () => {
      const orphan = module({
        id: 9,
        key: 'prescriptions',
        name: 'Recetas',
        statusId: 2,
        parentModule: { id: 99, key: 'patients', name: 'Pacientes' },
      });
      renderTable([orphan], { status: 'blocked' });

      expect(screen.getByText('Está en «Activos»')).toBeVisible();
      expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1);
      expect(screen.getByRole('rowheader')).toHaveTextContent(
        'Clínica, aplicación para clínicas · 0 módulos y 1 submódulo',
      );
    });

    it('has no axe violations with a tree, collapsed and expanded', async () => {
      const expanded = renderTable(tree);
      expect(await axe(expanded.container)).toHaveNoViolations();
      expanded.unmount();

      const collapsed = renderTable(tree, { collapsed: new Set([1]) });
      expect(await axe(collapsed.container)).toHaveNoViolations();
    });
  });
});
