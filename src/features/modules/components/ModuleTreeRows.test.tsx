import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ModuleTreeFlatRow } from '../policy/buildModuleTree';
import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import { ModuleTreeRows } from './ModuleTreeRows';

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 1,
    key: 'patients',
    name: 'Pacientes',
    description: null,
    sortOrder: 10,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 3,
    parentModule: null,
    actions: new Set(['read', 'update']),
    permissionIdByAction: new Map(),
    ...overrides,
  };
}

const PATIENTS = module();
const PRESCRIPTIONS = module({
  id: 2,
  key: 'prescriptions',
  name: 'Recetas',
  sortOrder: 20,
  actions: new Set(['read', 'write', 'update', 'delete']),
  parentModule: { id: 1, key: 'patients', name: 'Pacientes' },
});

function renderRows(
  rows: readonly ModuleTreeFlatRow[],
  props: Partial<ComponentProps<typeof ModuleTreeRows>> = {},
) {
  const onEdit = vi.fn();
  const onToggle = vi.fn();
  render(
    <Table>
      <TableBody>
        <ModuleTreeRows
          rows={rows}
          canEdit
          onEdit={onEdit}
          collapsed={new Set()}
          onToggle={onToggle}
          searching={false}
          status="active"
          {...props}
        />
      </TableBody>
    </Table>,
  );
  return { onEdit, onToggle };
}

describe('ModuleTreeRows', () => {
  it('paints a module with what it showed before: order, name, key, type and its actions in order', () => {
    renderRows([{ row: { kind: 'module', module: PATIENTS, childCount: 0 }, depth: 0 }]);

    const row = screen.getByRole('row');
    expect(within(row).getByText('10')).toBeVisible();
    expect(within(row).getByText('Pacientes')).toBeVisible();
    expect(within(row).getByText('patients')).toBeVisible();
    expect(within(row).getByText('Clínica')).toBeVisible();
    expect(
      within(row)
        .getAllByText(/^(Ver|Crear|Modificar|Eliminar)$/)
        .map((chip) => chip.textContent),
    ).toEqual(['Ver', 'Modificar']);
  });

  it('marks the base modules', () => {
    renderRows([
      {
        row: { kind: 'module', module: module({ key: 'users', name: 'Usuarios' }), childCount: 0 },
        depth: 0,
      },
    ]);

    expect(screen.getByText('Base')).toBeVisible();
  });

  it('paints a submodule with its own order, key, actions and edit action', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderRows([
      {
        row: {
          kind: 'submodule',
          module: PRESCRIPTIONS,
          childCount: 0,
          parent: { id: 1, key: 'patients', name: 'Pacientes' },
        },
        depth: 1,
      },
    ]);

    const row = screen.getByRole('row');
    expect(within(row).getByText('20')).toBeVisible();
    expect(within(row).getByText('Recetas')).toBeVisible();
    expect(within(row).getByText('prescriptions')).toBeVisible();
    expect(within(row).getByText('Submódulo de Pacientes')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledWith(2);
  });

  it('offers "Editar" only to whoever can edit', () => {
    renderRows([{ row: { kind: 'module', module: PATIENTS, childCount: 0 }, depth: 0 }], {
      canEdit: false,
    });

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('lets a parent collapse and expand, with its own id', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderRows([
      { row: { kind: 'module', module: PATIENTS, childCount: 2 }, depth: 0 },
    ]);

    await user.click(screen.getByRole('button', { name: '2 submódulos de Pacientes' }));

    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('shows a collapsed parent as not expanded', () => {
    renderRows([{ row: { kind: 'module', module: PATIENTS, childCount: 2 }, depth: 0 }], {
      collapsed: new Set([1]),
    });

    expect(screen.getByRole('button', { name: '2 submódulos de Pacientes' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  describe('a context row', () => {
    const parent = { id: 1, key: 'patients', name: 'Pacientes' };

    it('shows the parent dimmed and with no actions', () => {
      renderRows([
        { row: { kind: 'context', parent, reason: 'otherView', childCount: 1 }, depth: 0 },
      ]);

      const row = screen.getByRole('row');
      expect(within(row).getByText('Pacientes')).toBeVisible();
      expect(within(row).getByText('patients')).toBeVisible();
      expect(within(row).queryByRole('button')).not.toBeInTheDocument();
      expect(within(row).queryByText(/^(Ver|Crear|Modificar|Eliminar)$/)).not.toBeInTheDocument();
    });

    it('says the parent is in "Activos" when the view is "Bloqueados", and the other way round', () => {
      const { unmount } = renderRowsAndKeep(
        [{ row: { kind: 'context', parent, reason: 'otherView', childCount: 1 }, depth: 0 }],
        'blocked',
      );
      expect(screen.getByText('Está en «Activos»')).toBeVisible();
      unmount();

      renderRowsAndKeep(
        [{ row: { kind: 'context', parent, reason: 'otherView', childCount: 1 }, depth: 0 }],
        'active',
      );
      expect(screen.getByText('Está en «Bloqueados»')).toBeVisible();
    });

    it('says that a submodule of the parent matches the search', () => {
      renderRows([{ row: { kind: 'context', parent, reason: 'search', childCount: 1 }, depth: 0 }]);

      expect(screen.getByText('Su submódulo coincide con la búsqueda')).toBeVisible();
    });
  });
});

function renderRowsAndKeep(rows: readonly ModuleTreeFlatRow[], status: 'active' | 'blocked') {
  return render(
    <Table>
      <TableBody>
        <ModuleTreeRows
          rows={rows}
          canEdit
          onEdit={vi.fn()}
          collapsed={new Set()}
          onToggle={vi.fn()}
          searching={false}
          status={status}
        />
      </TableBody>
    </Table>,
  );
}
