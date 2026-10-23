import { describe, expect, it } from 'vitest';

import type { Module } from './module';
import {
  buildPermissionMatrix,
  countGranted,
  countTotal,
  withAllPermissionsToggled,
  withPermissionToggled,
} from './permissionMatrix';
import type { Permission } from './permission';

function makeModule(overrides: Partial<Module> & Pick<Module, 'id' | 'key' | 'name'>): Module {
  return { sortOrder: 0, type: { id: 2, name: 'Clínica' }, ...overrides };
}

function permission(id: number, moduleRef: Module | null, actionKey: string | null): Permission {
  return {
    id,
    name: `permission-${id}`,
    module: moduleRef === null ? null : { ...moduleRef },
    action: actionKey === null ? null : { id, key: actionKey, name: actionKey },
  };
}

describe('buildPermissionMatrix', () => {
  const patients = makeModule({ id: 5, key: 'patients', name: 'Pacientes', sortOrder: 50 });
  const appointments = makeModule({
    id: 6,
    key: 'appointments',
    name: 'Agenda y citas',
    sortOrder: 60,
  });
  const users = makeModule({
    id: 1,
    key: 'users',
    name: 'Usuarios',
    type: { id: 1, name: 'Sistema' },
  });

  it('includes only modules of roleTypeId, ordered by sortOrder then name', () => {
    const matrix = buildPermissionMatrix([appointments, patients, users], [], new Set(), 2);

    expect(matrix.map((row) => row.module.key)).toEqual(['patients', 'appointments']);
  });

  it('only pictures a cell for actions the module actually has in the permissions catalog', () => {
    const matrix = buildPermissionMatrix(
      [patients],
      [
        permission(101, patients, 'read'),
        permission(102, patients, 'write'),
        permission(103, null, 'update'), // no module: not this module's
        permission(104, appointments, 'delete'), // another module: not this one's
      ],
      new Set(),
      2,
    );

    expect(Object.keys(matrix[0]?.cells ?? {}).sort()).toEqual(['read', 'write']);
  });

  it('marks granted from the given set of permission ids', () => {
    const matrix = buildPermissionMatrix(
      [patients],
      [permission(101, patients, 'read')],
      new Set([101]),
      2,
    );

    expect(matrix[0]?.cells.read).toEqual({ permissionId: 101, granted: true });
  });

  it('includes a module with no resolvable permission as an empty row, not an error (edge case)', () => {
    const matrix = buildPermissionMatrix([patients], [], new Set(), 2);

    expect(matrix).toEqual([{ module: patients, cells: {} }]);
  });

  it('is empty when there are no modules of that type (edge case)', () => {
    expect(buildPermissionMatrix([users], [], new Set(), 2)).toEqual([]);
  });

  it('ignores a permission whose action key is not one of the four known ones', () => {
    const matrix = buildPermissionMatrix(
      [patients],
      [permission(101, patients, 'export')],
      new Set(),
      2,
    );

    expect(matrix[0]?.cells).toEqual({});
  });
});

describe('withPermissionToggled (FR-008)', () => {
  const row = {
    module: makeModule({ id: 5, key: 'patients', name: 'Pacientes' }),
    cells: {
      read: { permissionId: 1, granted: false },
      write: { permissionId: 2, granted: false },
      update: { permissionId: 3, granted: false },
      delete: { permissionId: 4, granted: false },
    },
  };

  it('granting write, update or delete also grants read in the same row', () => {
    const result = withPermissionToggled(row, 'write', true);

    expect(result.cells.write?.granted).toBe(true);
    expect(result.cells.read?.granted).toBe(true);
    expect(result.cells.update?.granted).toBe(false);
  });

  it('does nothing extra when read was already granted', () => {
    const readGranted = {
      ...row,
      cells: { ...row.cells, read: { permissionId: 1, granted: true } },
    };

    const result = withPermissionToggled(readGranted, 'update', true);

    expect(result.cells.read).toEqual({ permissionId: 1, granted: true });
  });

  it('revoking read revokes the rest of the row, keeping every column present', () => {
    const allGranted = {
      ...row,
      cells: {
        read: { permissionId: 1, granted: true },
        write: { permissionId: 2, granted: true },
        update: { permissionId: 3, granted: true },
        delete: { permissionId: 4, granted: true },
      },
    };

    const result = withPermissionToggled(allGranted, 'read', false);

    expect(result.cells).toEqual({
      read: { permissionId: 1, granted: false },
      write: { permissionId: 2, granted: false },
      update: { permissionId: 3, granted: false },
      delete: { permissionId: 4, granted: false },
    });
  });

  it('is a no-op for a column the row does not have', () => {
    const noWrite = { module: row.module, cells: { read: row.cells.read } };

    expect(withPermissionToggled(noWrite, 'write', true)).toEqual(noWrite);
  });

  it('does not mutate the row it receives', () => {
    withPermissionToggled(row, 'write', true);

    expect(row.cells.read.granted).toBe(false);
  });
});

describe('withAllPermissionsToggled ("Todo el módulo", FR-009)', () => {
  const row = {
    module: makeModule({ id: 7, key: 'reminders', name: 'Recordatorios' }),
    cells: {
      read: { permissionId: 1, granted: false },
      update: { permissionId: 2, granted: true },
    },
  };

  it('grants every present cell, never one the row does not have', () => {
    const result = withAllPermissionsToggled(row, true);

    expect(result.cells).toEqual({
      read: { permissionId: 1, granted: true },
      update: { permissionId: 2, granted: true },
    });
  });

  it('revokes every present cell', () => {
    const result = withAllPermissionsToggled(row, false);

    expect(result.cells).toEqual({
      read: { permissionId: 1, granted: false },
      update: { permissionId: 2, granted: false },
    });
  });
});

describe('countGranted / countTotal (the "X de Y permisos" counter)', () => {
  const matrix = [
    {
      module: makeModule({ id: 5, key: 'patients', name: 'Pacientes' }),
      cells: {
        read: { permissionId: 1, granted: true },
        write: { permissionId: 2, granted: false },
      },
    },
    {
      module: makeModule({ id: 6, key: 'appointments', name: 'Agenda y citas' }),
      cells: { read: { permissionId: 3, granted: true } },
    },
  ];

  it('counts granted cells and total cells across the whole matrix', () => {
    expect(countGranted(matrix)).toBe(2);
    expect(countTotal(matrix)).toBe(3);
  });

  it('is 0 of 0 for an empty matrix', () => {
    expect(countGranted([])).toBe(0);
    expect(countTotal([])).toBe(0);
  });
});
