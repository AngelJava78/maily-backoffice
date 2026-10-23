import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useModulesLocation } from './useModulesLocation';

function renderAt(path: string) {
  return renderHook(() => useModulesLocation(), {
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    ),
  });
}

describe('useModulesLocation', () => {
  it('reflects the search params', () => {
    const { result } = renderAt('/modules?type_id=2&status_id=2&q=agenda');

    expect(result.current.location).toEqual({
      type: 'clinic',
      status: 'blocked',
      search: 'agenda',
      panel: { kind: 'none' },
    });
  });

  it('setType keeps the other params', () => {
    const { result } = renderAt('/modules?q=agenda');

    act(() => result.current.setType('system'));

    expect(result.current.location).toEqual({
      type: 'system',
      status: 'active',
      search: 'agenda',
      panel: { kind: 'none' },
    });
  });

  it('setStatus keeps the other params', () => {
    const { result } = renderAt('/modules?type_id=2');

    act(() => result.current.setStatus('blocked'));

    expect(result.current.location.status).toBe('blocked');
    expect(result.current.location.type).toBe('clinic');
  });

  it('setSearch keeps the other params', () => {
    const { result } = renderAt('/modules?type_id=1');

    act(() => result.current.setSearch('agenda'));

    expect(result.current.location.search).toBe('agenda');
    expect(result.current.location.type).toBe('system');
  });

  it('openEdit opens the edit panel and closes "new"', () => {
    const { result } = renderAt('/modules?new=1');

    act(() => result.current.openEdit(42));

    expect(result.current.location.panel).toEqual({ kind: 'edit', moduleId: 42 });
  });

  it('openCreate opens the create panel and closes "edit"', () => {
    const { result } = renderAt('/modules?edit=42');

    act(() => result.current.openCreate());

    expect(result.current.location.panel).toEqual({ kind: 'create' });
  });

  it('closePanel removes edit and new', () => {
    const { result } = renderAt('/modules?edit=42');

    act(() => result.current.closePanel());

    expect(result.current.location.panel).toEqual({ kind: 'none' });
  });

  it('normalizes an address at default values without keeping them', () => {
    const { result } = renderAt('/modules?type_id=1&status_id=1');

    expect(result.current.location.type).toBe('system');
    expect(result.current.location.status).toBe('active');
  });
});
