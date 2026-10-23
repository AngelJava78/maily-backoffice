import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PermissionMatrix } from '../schemas/permissionMatrix';
import { useEditablePermissionMatrix } from './useEditablePermissionMatrix';

/** Two modules, like `rolesCatalogScenario()`'s Sistema side: `roles` has all four actions,
 * `permissions` only Ver and Modificar (so the Ver-prerequisite and "todo el módulo" rules have
 * a column that is sometimes absent to exercise, as the real catalog does for some modules). */
function baseMatrix(granted: readonly number[] = []): PermissionMatrix {
  const isGranted = (id: number) => granted.includes(id);
  return [
    {
      module: {
        id: 10,
        key: 'roles',
        name: 'Roles',
        sortOrder: 1,
        type: { id: 1, name: 'Sistema' },
      },
      cells: {
        read: { permissionId: 1, granted: isGranted(1) },
        write: { permissionId: 2, granted: isGranted(2) },
        update: { permissionId: 3, granted: isGranted(3) },
        delete: { permissionId: 4, granted: isGranted(4) },
      },
    },
    {
      module: {
        id: 20,
        key: 'permissions',
        name: 'Permisos',
        sortOrder: 2,
        type: { id: 1, name: 'Sistema' },
      },
      cells: {
        read: { permissionId: 5, granted: isGranted(5) },
        update: { permissionId: 6, granted: isGranted(6) },
      },
    },
  ];
}

describe('useEditablePermissionMatrix', () => {
  it('starts clean: matrix mirrors the base, nothing pending', () => {
    const { result } = renderHook(() => useEditablePermissionMatrix(baseMatrix([1]), 'role-1'));

    expect(result.current.isDirty).toBe(false);
    expect(result.current.matrix).toEqual(baseMatrix([1]));
    expect(result.current.diff()).toEqual({ toAssociate: [], toDisassociate: [] });
  });

  it('gives no matrix while the base matrix has not loaded yet', () => {
    const { result } = renderHook(() => useEditablePermissionMatrix(undefined, 'role-1'));

    expect(result.current.matrix).toBeUndefined();
    expect(result.current.isDirty).toBe(false);
  });

  it('granting write also grants read (FR-008), and both become pending', () => {
    const { result } = renderHook(() => useEditablePermissionMatrix(baseMatrix([]), 'role-1'));

    act(() => {
      result.current.toggle(10, 'write', true);
    });

    expect(result.current.matrix?.[0]?.cells.read?.granted).toBe(true);
    expect(result.current.matrix?.[0]?.cells.write?.granted).toBe(true);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.diff()).toEqual({ toAssociate: [1, 2], toDisassociate: [] });
  });

  it('revoking read revokes the rest of that row (FR-008)', () => {
    const { result } = renderHook(() =>
      useEditablePermissionMatrix(baseMatrix([1, 2, 3, 4]), 'role-1'),
    );

    act(() => {
      result.current.toggle(10, 'read', false);
    });

    const row = result.current.matrix?.[0];
    expect(row?.cells.read?.granted).toBe(false);
    expect(row?.cells.write?.granted).toBe(false);
    expect(row?.cells.update?.granted).toBe(false);
    expect(row?.cells.delete?.granted).toBe(false);
    expect(result.current.diff()).toEqual({ toAssociate: [], toDisassociate: [1, 2, 3, 4] });
  });

  it('"todo el módulo" grants or revokes only the cells the row actually has (FR-009)', () => {
    const { result } = renderHook(() => useEditablePermissionMatrix(baseMatrix([]), 'role-1'));

    act(() => {
      result.current.toggleAll(20, true);
    });

    const row = result.current.matrix?.[1];
    expect(row?.cells.read?.granted).toBe(true);
    expect(row?.cells.update?.granted).toBe(true);
    expect(result.current.diff()).toEqual({ toAssociate: [5, 6], toDisassociate: [] });
  });

  it('toggling a cell back to its original value clears it from the pending diff', () => {
    const { result } = renderHook(() => useEditablePermissionMatrix(baseMatrix([1]), 'role-1'));

    act(() => {
      result.current.toggle(10, 'write', true);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.toggle(10, 'write', false);
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.diff()).toEqual({ toAssociate: [], toDisassociate: [] });
  });

  it('reset() discards every pending toggle', () => {
    const { result } = renderHook(() => useEditablePermissionMatrix(baseMatrix([]), 'role-1'));

    act(() => {
      result.current.toggleAll(10, true);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.matrix).toEqual(baseMatrix([]));
  });

  it('changing resetKey (a different role chosen) discards pending toggles on its own', () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useEditablePermissionMatrix(baseMatrix([]), key),
      { initialProps: { key: 'role-1' } },
    );

    act(() => {
      result.current.toggleAll(10, true);
    });
    expect(result.current.isDirty).toBe(true);

    rerender({ key: 'role-2' });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.matrix).toEqual(baseMatrix([]));
  });
});
