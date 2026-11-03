import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCollapsedModules } from './useCollapsedModules';

describe('useCollapsedModules', () => {
  it('starts with nothing collapsed', () => {
    const { result } = renderHook(() => useCollapsedModules());

    expect(result.current.collapsed.size).toBe(0);
  });

  it('collapses a module and expands it again with toggle', () => {
    const { result } = renderHook(() => useCollapsedModules());

    act(() => {
      result.current.toggle(7);
    });
    expect(result.current.collapsed.has(7)).toBe(true);

    act(() => {
      result.current.toggle(7);
    });
    expect(result.current.collapsed.has(7)).toBe(false);
  });

  it('expand takes the module out of the collapsed ones and leaves the others', () => {
    const { result } = renderHook(() => useCollapsedModules());
    act(() => {
      result.current.toggle(1);
      result.current.toggle(2);
    });

    act(() => {
      result.current.expand(1);
    });

    expect([...result.current.collapsed]).toEqual([2]);
  });

  it('expand does nothing for a module that was not collapsed', () => {
    const { result } = renderHook(() => useCollapsedModules());
    const before = result.current.collapsed;

    act(() => {
      result.current.expand(5);
    });

    expect(result.current.collapsed).toBe(before);
  });

  it('does not keep anything between visits: a new hook starts expanded', () => {
    const first = renderHook(() => useCollapsedModules());
    act(() => {
      first.result.current.toggle(3);
    });
    first.unmount();

    const second = renderHook(() => useCollapsedModules());

    expect(second.result.current.collapsed.size).toBe(0);
  });
});
