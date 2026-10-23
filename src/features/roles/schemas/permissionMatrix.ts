import type { Module } from './module';
import type { Permission } from './permission';

export type ActionKey = 'read' | 'write' | 'update' | 'delete';

/** The fixed column order (FR-007): Ver, Crear, Modificar, Eliminar. */
export const ACTION_KEYS: readonly ActionKey[] = ['read', 'write', 'update', 'delete'];

function isActionKey(key: string): key is ActionKey {
  return ACTION_KEYS.some((candidate) => candidate === key);
}

export interface PermissionMatrixCell {
  readonly permissionId: number;
  readonly granted: boolean;
}

export type PermissionMatrixCells = Partial<Record<ActionKey, PermissionMatrixCell>>;

export interface PermissionMatrixRow {
  readonly module: Module;
  readonly cells: PermissionMatrixCells;
}

export type PermissionMatrix = readonly PermissionMatrixRow[];

function byRowOrder(a: Module, b: Module): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

/**
 * Builds the permission matrix of a role (research D3; FR-006, FR-007): one row per module of
 * `roleTypeId`, one cell per action that module actually has in `permissions` — never a hardcoded
 * list of modules or actions, so the table works the same with 0 modules as with many.
 */
export function buildPermissionMatrix(
  modules: readonly Module[],
  permissions: readonly Permission[],
  grantedPermissionIds: ReadonlySet<number>,
  roleTypeId: 1 | 2,
): PermissionMatrix {
  return modules
    .filter((candidate) => candidate.type.id === roleTypeId)
    .slice()
    .sort(byRowOrder)
    .map((module) => {
      const cells: PermissionMatrixCells = {};
      for (const permission of permissions) {
        if (permission.module?.id !== module.id || permission.action === null) {
          continue;
        }
        if (!isActionKey(permission.action.key)) {
          continue;
        }
        cells[permission.action.key] = {
          permissionId: permission.id,
          granted: grantedPermissionIds.has(permission.id),
        };
      }
      return { module, cells };
    });
}

function mapCells(
  cells: PermissionMatrixCells,
  project: (cell: PermissionMatrixCell) => PermissionMatrixCell,
): PermissionMatrixCells {
  const result: PermissionMatrixCells = {};
  for (const key of ACTION_KEYS) {
    const cell = cells[key];
    if (cell !== undefined) {
      result[key] = project(cell);
    }
  }
  return result;
}

/**
 * Toggles one cell of a row, enforcing FR-008: granting write/update/delete also grants read;
 * revoking read revokes the rest of the row, keeping every column it had. A no-op for a column the
 * row does not have. Does not mutate `row`.
 */
export function withPermissionToggled(
  row: PermissionMatrixRow,
  actionKey: ActionKey,
  checked: boolean,
): PermissionMatrixRow {
  const cell = row.cells[actionKey];
  if (cell === undefined) {
    return row;
  }
  let cells: PermissionMatrixCells = { ...row.cells, [actionKey]: { ...cell, granted: checked } };
  if (actionKey === 'read' && !checked) {
    cells = mapCells(cells, (current) => ({ ...current, granted: false }));
  } else if (actionKey !== 'read' && checked) {
    const read = cells.read;
    if (read !== undefined && !read.granted) {
      cells = { ...cells, read: { ...read, granted: true } };
    }
  }
  return { ...row, cells };
}

/** "Todo el módulo" (FR-009): grants or revokes every action the row has, in one call. */
export function withAllPermissionsToggled(row: PermissionMatrixRow, checked: boolean): PermissionMatrixRow {
  return { ...row, cells: mapCells(row.cells, (cell) => ({ ...cell, granted: checked })) };
}

/** "X" of the "X de Y permisos" counter: how many cells of the whole matrix are granted. */
export function countGranted(matrix: PermissionMatrix): number {
  let count = 0;
  for (const row of matrix) {
    for (const key of ACTION_KEYS) {
      if (row.cells[key]?.granted === true) {
        count += 1;
      }
    }
  }
  return count;
}

/** "Y" of the "X de Y permisos" counter: how many cells the whole matrix has, granted or not. */
export function countTotal(matrix: PermissionMatrix): number {
  let count = 0;
  for (const row of matrix) {
    count += ACTION_KEYS.filter((key) => row.cells[key] !== undefined).length;
  }
  return count;
}
