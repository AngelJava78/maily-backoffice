import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Module } from '../schemas/module';
import {
  buildPermissionMatrix,
  withAllPermissionsToggled,
  withPermissionToggled,
  type PermissionMatrix as Matrix,
} from '../schemas/permissionMatrix';
import type { Permission } from '../schemas/permission';
import { PermissionsMatrix } from './PermissionsMatrix';

function module(overrides: Partial<Module> & Pick<Module, 'id' | 'key' | 'name'>): Module {
  return { sortOrder: 0, type: { id: 2, name: 'Clínica' }, ...overrides };
}

function permission(id: number, mod: Module | null, actionKey: string | null): Permission {
  return {
    id,
    name: `permission-${id}`,
    module: mod === null ? null : { ...mod },
    action: actionKey === null ? null : { id, key: actionKey, name: actionKey },
  };
}

const PATIENTS = module({ id: 5, key: 'patients', name: 'Pacientes', sortOrder: 50 });
const REMINDERS = module({ id: 7, key: 'reminders', name: 'Recordatorios', sortOrder: 70 });
const USERS = module({
  id: 1,
  key: 'users',
  name: 'Usuarios',
  sortOrder: 10,
  type: { id: 1, name: 'Sistema' },
});

function richMatrix(): Matrix {
  return buildPermissionMatrix(
    [PATIENTS, REMINDERS],
    [
      permission(1, PATIENTS, 'read'),
      permission(2, PATIENTS, 'write'),
      permission(3, PATIENTS, 'update'),
      permission(4, PATIENTS, 'delete'),
      permission(5, REMINDERS, 'read'),
      permission(6, REMINDERS, 'update'),
    ],
    new Set(),
    2,
  );
}

/** A Clínica role's matrix after it also gains the Sistema modules (FR-001): two groups. */
function mixedTypeMatrix(): Matrix {
  const clinicRows = buildPermissionMatrix(
    [PATIENTS, REMINDERS],
    [permission(1, PATIENTS, 'read'), permission(5, REMINDERS, 'read')],
    new Set(),
    2,
  );
  const systemRows = buildPermissionMatrix([USERS], [permission(10, USERS, 'read')], new Set(), 1);
  return [...clinicRows, ...systemRows];
}

function Harness({ initial }: { readonly initial: Matrix }) {
  const [matrix, setMatrix] = useState(initial);
  return (
    <PermissionsMatrix
      matrix={matrix}
      pending={false}
      onToggle={(moduleId, actionKey, checked) => {
        setMatrix(
          matrix.map((row) =>
            row.module.id === moduleId ? withPermissionToggled(row, actionKey, checked) : row,
          ),
        );
      }}
      onToggleAll={(moduleId, checked) => {
        setMatrix(
          matrix.map((row) =>
            row.module.id === moduleId ? withAllPermissionsToggled(row, checked) : row,
          ),
        );
      }}
    />
  );
}

describe('PermissionsMatrix', () => {
  it('shows a column header only for actions at least one module has', () => {
    render(<Harness initial={richMatrix()} />);

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Módulo', 'Ver', 'Crear', 'Modificar', 'Eliminar', 'Todo el módulo']);
  });

  it("omits a column no module has at all (e.g. no module with 'Eliminar' in this type)", () => {
    const matrix = buildPermissionMatrix(
      [REMINDERS],
      [permission(5, REMINDERS, 'read'), permission(6, REMINDERS, 'update')],
      new Set(),
      2,
    );
    render(<Harness initial={matrix} />);

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Módulo', 'Ver', 'Modificar', 'Todo el módulo']);
  });

  it('leaves a cell empty for a module that does not have that action (Recordatorios: no Crear/Eliminar)', () => {
    render(<Harness initial={richMatrix()} />);

    const remindersRow = screen.getByRole('row', { name: /Recordatorios/ });
    expect(within(remindersRow).getAllByRole('checkbox')).toHaveLength(3); // Ver, Modificar, Todo el módulo
  });

  it('shows the empty-catalog message instead of a table when there are no modules of this type', () => {
    render(
      <PermissionsMatrix matrix={[]} pending={false} onToggle={vi.fn()} onToggleAll={vi.fn()} />,
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.getByText('Este tipo todavía no tiene módulos en el catálogo.'),
    ).toBeInTheDocument();
  });

  it('toggling a cell updates the matrix through the callbacks (Ver-prerequisite still applies)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={richMatrix()} />);

    await user.click(screen.getByRole('checkbox', { name: 'Crear de Pacientes' }));

    expect(screen.getByRole('checkbox', { name: 'Crear de Pacientes' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Ver de Pacientes' })).toBeChecked();
  });

  it('groups rows by module type under a header, Clínica first, when the matrix mixes types (FR-004)', () => {
    render(<Harness initial={mixedTypeMatrix()} />);

    expect(screen.getByText('Módulos de Clínica')).toBeInTheDocument();
    expect(screen.getByText('Módulos de Sistema')).toBeInTheDocument();

    const rowTexts = screen.getAllByRole('row').map((row) => row.textContent);
    const clinicHeaderIndex = rowTexts.findIndex((text) => text === 'Módulos de Clínica');
    const patientsRowIndex = rowTexts.findIndex((text) => text.includes('Pacientes'));
    const systemHeaderIndex = rowTexts.findIndex((text) => text === 'Módulos de Sistema');
    const usersRowIndex = rowTexts.findIndex((text) => text.includes('Usuarios'));
    expect(clinicHeaderIndex).toBeLessThan(patientsRowIndex);
    expect(patientsRowIndex).toBeLessThan(systemHeaderIndex);
    expect(systemHeaderIndex).toBeLessThan(usersRowIndex);
  });

  it('shows no group header when every row is of the same module type (no regression, FR-005)', () => {
    render(<Harness initial={richMatrix()} />);

    expect(screen.queryByText(/^Módulos de /)).not.toBeInTheDocument();
  });

  it('reports which moduleId changed when a whole-row toggle happens', async () => {
    const onToggleAll = vi.fn();
    const user = userEvent.setup();
    render(
      <PermissionsMatrix
        matrix={richMatrix()}
        pending={false}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Todo el módulo de Pacientes' }));

    expect(onToggleAll).toHaveBeenCalledWith(PATIENTS.id, true);
  });
});
