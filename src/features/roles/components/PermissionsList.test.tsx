import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';

import type { Module } from '../schemas/module';
import {
  buildPermissionMatrix,
  withPermissionToggled,
  type ActionKey,
  type PermissionMatrix as Matrix,
} from '../schemas/permissionMatrix';
import type { Permission } from '../schemas/permission';
import { PermissionsList } from './PermissionsList';

const LABEL = 'Permisos de Doctor por módulo y acción';

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

function renderList(matrix: Matrix, pending = false) {
  return render(
    <PermissionsList
      matrix={matrix}
      label={LABEL}
      pending={pending}
      onToggle={vi.fn()}
      onToggleAll={vi.fn()}
    />,
  );
}

/** A stateful harness: applies the same pure rules `RoleDetailPanel` uses, and reports every toggle. */
function Harness({
  initial,
  onToggle = vi.fn(),
}: {
  readonly initial: Matrix;
  readonly onToggle?: (moduleId: number, actionKey: ActionKey, checked: boolean) => void;
}) {
  const [matrix, setMatrix] = useState(initial);
  return (
    <PermissionsList
      matrix={matrix}
      label={LABEL}
      pending={false}
      onToggle={(moduleId, actionKey, checked) => {
        onToggle(moduleId, actionKey, checked);
        setMatrix(
          matrix.map((row) =>
            row.module.id === moduleId ? withPermissionToggled(row, actionKey, checked) : row,
          ),
        );
      }}
      onToggleAll={vi.fn()}
    />
  );
}

/** The list item of a module (a `<li>` has no accessible name of its own, so it is found by its text). */
function itemOf(moduleName: string): HTMLElement {
  const item = screen
    .getAllByRole('listitem')
    .find((candidate) => within(candidate).queryByText(moduleName) !== null);
  if (item === undefined) {
    throw new Error(`No list item for the module "${moduleName}"`);
  }
  return item;
}

function buttonNamesOf(item: HTMLElement): (string | null)[] {
  return within(item)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'));
}

describe('PermissionsList', () => {
  it('is a list named after the role and described by a visible helper text (FR-001, FR-014)', () => {
    renderList(richMatrix());

    const list = screen.getByRole('list', { name: LABEL });
    expect(list).toHaveAccessibleDescription(messages.roles.detail.matrixHelper);
    expect(screen.getByText(messages.roles.detail.matrixHelper)).toBeVisible();
  });

  it('shows one item per module, in the order received', () => {
    renderList(richMatrix());

    const items = within(screen.getByRole('list', { name: LABEL })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Pacientes');
    expect(items[1]).toHaveTextContent('Recordatorios');
  });

  it('is no longer a table: no table and no column headers', () => {
    renderList(richMatrix());

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
  });

  it('gives each module only the buttons of its own actions (Recordatorios: no Crear/Eliminar)', () => {
    renderList(richMatrix());

    expect(buttonNamesOf(itemOf('Pacientes'))).toEqual([
      'Ver de Pacientes',
      'Crear de Pacientes',
      'Modificar de Pacientes',
      'Eliminar de Pacientes',
      'Todo el módulo de Pacientes',
    ]);
    expect(buttonNamesOf(itemOf('Recordatorios'))).toEqual([
      'Ver de Recordatorios',
      'Modificar de Recordatorios',
      'Todo el módulo de Recordatorios',
    ]);
  });

  it('shows the empty-catalog message instead of a list when there are no modules of this type', () => {
    renderList([]);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(
      screen.getByText('Este tipo todavía no tiene módulos en el catálogo.'),
    ).toBeInTheDocument();
  });

  it('groups items by module type under a header, Clínica first, when the matrix mixes types (FR-009)', () => {
    renderList(mixedTypeMatrix());

    expect(screen.getByText('Módulos de Clínica')).toBeInTheDocument();
    expect(screen.getByText('Módulos de Sistema')).toBeInTheDocument();

    const texts = screen.getAllByRole('listitem').map((item) => item.textContent);
    const clinicHeaderIndex = texts.findIndex((text) => text === 'Módulos de Clínica');
    const patientsIndex = texts.findIndex((text) => text.includes('Pacientes'));
    const systemHeaderIndex = texts.findIndex((text) => text === 'Módulos de Sistema');
    const usersIndex = texts.findIndex((text) => text.includes('Usuarios'));
    expect(clinicHeaderIndex).toBeLessThan(patientsIndex);
    expect(patientsIndex).toBeLessThan(systemHeaderIndex);
    expect(systemHeaderIndex).toBeLessThan(usersIndex);
  });

  it('shows no group header when every module is of the same type (no regression, FR-009)', () => {
    renderList(richMatrix());

    expect(screen.queryByText(/^Módulos de /)).not.toBeInTheDocument();
  });

  it('keeps every button not operable while pending', () => {
    renderList(richMatrix(), true);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  it('toggling a button updates the list through the callbacks (the Ver prerequisite still applies)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={richMatrix()} />);

    await user.click(screen.getByRole('button', { name: 'Crear de Pacientes' }));

    expect(screen.getByRole('button', { name: 'Crear de Pacientes', pressed: true })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver de Pacientes', pressed: true })).toBeVisible();
    // Another module is not affected.
    expect(
      screen.getByRole('button', { name: 'Ver de Recordatorios', pressed: false }),
    ).toBeVisible();
  });

  it('reports which module and action changed, and the value asked for', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={richMatrix()} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: 'Crear de Pacientes' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(PATIENTS.id, 'write', true);
  });

  it('reports which module changed when a whole-module toggle happens', async () => {
    const onToggleAll = vi.fn();
    const user = userEvent.setup();
    render(
      <PermissionsList
        matrix={richMatrix()}
        label={LABEL}
        pending={false}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Todo el módulo de Pacientes' }));

    expect(onToggleAll).toHaveBeenCalledTimes(1);
    expect(onToggleAll).toHaveBeenCalledWith(PATIENTS.id, true);
  });
});
