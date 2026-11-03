import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createWrapper } from '@/test/renderWithProviders';

import { useRolePermissionsLocation } from './useRolePermissionsLocation';

/** Todos, Activos, the first page and 10 per page: the table when the address does not say. */
const DEFAULTS = { type: 'all', status: 'active', page: 1, pageSize: 10 } as const;

function setup(route: string) {
  const { wrapper, router } = createWrapper({ route });
  const { result } = renderHook(() => useRolePermissionsLocation(), { wrapper });
  return { result, router };
}

describe('useRolePermissionsLocation', () => {
  it('reads both filters, the page and the page size from the address', () => {
    const { result } = setup('/roles?type=clinica&status=bloqueados&page=2&page_size=25');

    expect(result.current.location).toEqual({
      type: 'clinic',
      status: 'blocked',
      page: 2,
      pageSize: 25,
    });
  });

  it('opens with Todos, Activos, the first page and 10 per page when the address does not say (FR-007)', () => {
    expect(setup('/roles').result.current.location).toEqual(DEFAULTS);
  });

  it('normalizes an address with invalid values, replacing it so the history gets no new entry (FR-018)', async () => {
    const { result, router } = setup('/roles?type=xyz&status=otro&page=0&page_size=7');

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(result.current.location).toEqual(DEFAULTS);
  });

  it('turns an address with an old roleId into its normal form (the old link is redirected before, FR-019)', async () => {
    const { router } = setup('/roles?type=sistema&roleId=5');

    await waitFor(() => {
      expect(router.state.location.search).toBe('?type=sistema');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('leaves an address that is already normal as it is', () => {
    const { router } = setup('/roles?type=sistema&page=2');

    expect(router.state.location.search).toBe('?type=sistema&page=2');
    expect(router.state.historyAction).toBe('POP');
  });

  it('gives the search of the table as the address writes it, to carry it to the detail (research D6)', () => {
    expect(setup('/roles?page=3&page_size=25').result.current.search).toBe('?page=3&page_size=25');
    expect(setup('/roles?status=bloqueados&type=sistema&page=2').result.current.search).toBe(
      '?type=sistema&status=bloqueados&page=2',
    );
    expect(setup('/roles').result.current.search).toBe('');
  });

  describe('the actions of the person', () => {
    it('goes back to the first page, with the same page size, when a filter changes (FR-007)', () => {
      const { result, router } = setup('/roles?page=3&page_size=25');

      act(() => {
        result.current.setType('system');
      });
      expect(router.state.location.search).toBe('?type=sistema&page_size=25');
      expect(router.state.historyAction).toBe('PUSH');

      act(() => {
        result.current.setStatus('blocked');
      });
      expect(router.state.location.search).toBe('?type=sistema&status=bloqueados&page_size=25');

      act(() => {
        result.current.setType('all');
      });
      expect(router.state.location.search).toBe('?status=bloqueados&page_size=25');

      act(() => {
        result.current.setStatus('active');
      });
      expect(router.state.location.search).toBe('?page_size=25');
    });

    it('goes to another page keeping the filters and the page size, adding an entry to the history', () => {
      const { result, router } = setup('/roles?type=clinica&page_size=25');

      act(() => {
        result.current.setPage(3);
      });

      expect(router.state.location.search).toBe('?type=clinica&page=3&page_size=25');
      expect(router.state.historyAction).toBe('PUSH');
      expect(result.current.location).toEqual({
        type: 'clinic',
        status: 'active',
        page: 3,
        pageSize: 25,
      });
    });

    it('can go to a page replacing the entry, as when the page asked for does not exist (FR-018)', () => {
      const { result, router } = setup('/roles?page=99');

      act(() => {
        result.current.setPage(4, { replace: true });
      });

      expect(router.state.location.search).toBe('?page=4');
      expect(router.state.historyAction).toBe('REPLACE');
    });

    it('goes back to the first page when the page size changes (FR-008)', () => {
      const { result, router } = setup('/roles?type=sistema&page=4');

      act(() => {
        result.current.setPageSize(25);
      });

      expect(router.state.location.search).toBe('?type=sistema&page_size=25');
      expect(result.current.location).toEqual({
        type: 'system',
        status: 'active',
        page: 1,
        pageSize: 25,
      });
    });

    it('accepts only 10, 25 and 50 as a page size: anything else becomes the default', () => {
      const { result, router } = setup('/roles?page=2&page_size=25');

      act(() => {
        result.current.setPageSize(7);
      });

      expect(router.state.location.search).toBe('');
      expect(result.current.location).toEqual(DEFAULTS);
    });
  });
});
