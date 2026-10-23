import { useState } from 'react';

import {
  ACTION_KEYS,
  withAllPermissionsToggled,
  withPermissionToggled,
  type ActionKey,
  type PermissionMatrix,
  type PermissionMatrixRow,
} from '../schemas/permissionMatrix';

export interface PermissionMatrixDiff {
  readonly toAssociate: readonly number[];
  readonly toDisassociate: readonly number[];
}

export interface UseEditablePermissionMatrixResult {
  /** `baseMatrix` with every pending toggle applied; `undefined` while there is no base yet. */
  readonly matrix: PermissionMatrix | undefined;
  readonly isDirty: boolean;
  readonly toggle: (moduleId: number, actionKey: ActionKey, checked: boolean) => void;
  readonly toggleAll: (moduleId: number, checked: boolean) => void;
  /** The permission ids to associate/disassociate to turn `baseMatrix` into `matrix` (research D6). */
  readonly diff: () => PermissionMatrixDiff;
  /** Discards every pending toggle, going back to `baseMatrix`. */
  readonly reset: () => void;
}

function applyOverridesToRow(
  row: PermissionMatrixRow,
  overrides: ReadonlyMap<number, boolean>,
): PermissionMatrixRow {
  if (overrides.size === 0) {
    return row;
  }
  let cells = row.cells;
  let changed = false;
  for (const key of ACTION_KEYS) {
    const cell = cells[key];
    if (cell === undefined) {
      continue;
    }
    const override = overrides.get(cell.permissionId);
    if (override !== undefined && override !== cell.granted) {
      if (!changed) {
        cells = { ...cells };
        changed = true;
      }
      cells[key] = { ...cell, granted: override };
    }
  }
  return changed ? { ...row, cells } : row;
}

/** Adds to `overrides` only the cells of `base` whose row-in-progress `next` now disagrees with;
 * a cell `next` brought back to `base`'s own value is cleared instead of kept as a no-op override. */
function mergedOverrides(
  previous: ReadonlyMap<number, boolean>,
  base: PermissionMatrixRow,
  next: PermissionMatrixRow,
): ReadonlyMap<number, boolean> {
  const result = new Map(previous);
  for (const key of ACTION_KEYS) {
    const baseCell = base.cells[key];
    const nextCell = next.cells[key];
    if (baseCell === undefined || nextCell === undefined) {
      continue;
    }
    if (nextCell.granted === baseCell.granted) {
      result.delete(baseCell.permissionId);
    } else {
      result.set(baseCell.permissionId, nextCell.granted);
    }
  }
  return result;
}

/**
 * The permission matrix of the role being edited, as a local working copy on top of the matrix
 * the server has (`baseMatrix`): every toggle (FR-008, FR-009) is kept as a pending override until
 * `reset()` is called (research D6: "Guardar cambios"/"Descartar cambios" act on all of them at
 * once) — an override that lands back on `baseMatrix`'s own value is dropped, so `isDirty` and
 * `diff()` only ever reflect a real, pending difference. Changing `resetKey` (a different role
 * chosen) discards any pending toggle on its own, the same as calling `reset()`.
 */
export function useEditablePermissionMatrix(
  baseMatrix: PermissionMatrix | undefined,
  resetKey: unknown,
): UseEditablePermissionMatrixResult {
  const [overrides, setOverrides] = useState<ReadonlyMap<number, boolean>>(new Map());
  const [lastKey, setLastKey] = useState(resetKey);

  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setOverrides(new Map());
  }

  function rowFor(
    moduleId: number,
  ): { base: PermissionMatrixRow; current: PermissionMatrixRow } | undefined {
    const base = baseMatrix?.find((row) => row.module.id === moduleId);
    if (base === undefined) {
      return undefined;
    }
    return { base, current: applyOverridesToRow(base, overrides) };
  }

  return {
    matrix: baseMatrix?.map((row) => applyOverridesToRow(row, overrides)),
    isDirty: overrides.size > 0,
    toggle: (moduleId, actionKey, checked) => {
      const rows = rowFor(moduleId);
      if (rows === undefined) {
        return;
      }
      const next = withPermissionToggled(rows.current, actionKey, checked);
      setOverrides((previous) => mergedOverrides(previous, rows.base, next));
    },
    toggleAll: (moduleId, checked) => {
      const rows = rowFor(moduleId);
      if (rows === undefined) {
        return;
      }
      const next = withAllPermissionsToggled(rows.current, checked);
      setOverrides((previous) => mergedOverrides(previous, rows.base, next));
    },
    diff: () => {
      const toAssociate: number[] = [];
      const toDisassociate: number[] = [];
      for (const [permissionId, granted] of overrides) {
        (granted ? toAssociate : toDisassociate).push(permissionId);
      }
      return { toAssociate, toDisassociate };
    },
    reset: () => {
      setOverrides(new Map());
    },
  };
}
