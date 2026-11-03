import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createWrapper } from '@/test/renderWithProviders';

import { useUsersLocation } from './useUsersLocation';

/** Todos and Activos, the filters when the address does not say. */
const DEFAULTS = { type: 'all', status: 'active' } as const;

function setup(route: string) {
  const { wrapper, router } = createWrapper({ route });
  const { result } = renderHook(() => useUsersLocation(), { wrapper });
  return { result, router };
}

describe('useUsersLocation', () => {
  it('reads the list from the address: the page and the page size', () => {
    const { result } = setup('/users?page=2&page_size=25');

    expect(result.current.location).toEqual({ mode: 'list', page: 2, pageSize: 25, ...DEFAULTS });
  });

  it('reads a search by email from the address', () => {
    const { result } = setup('/users?email=ana@clinica.com');

    expect(result.current.location).toEqual({
      mode: 'search',
      email: 'ana@clinica.com',
      ...DEFAULTS,
    });
  });

  it('reads both filters from the address (feature 026)', () => {
    const { result } = setup('/users?type_id=2&status_id=2&page=2');

    expect(result.current.location).toEqual({
      mode: 'list',
      page: 2,
      pageSize: 10,
      type: 'clinic',
      status: 'blocked',
    });
  });

  it('normalizes an address with invalid values, replacing it so the history gets no new entry', async () => {
    const { result, router } = setup('/users?page=abc&page_size=7&type_id=9&status_id=3');

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(result.current.location).toEqual({ mode: 'list', page: 1, pageSize: 10, ...DEFAULTS });
  });

  it('leaves an address that is already normal as it is', () => {
    const { router } = setup('/users?page=2');

    expect(router.state.location.search).toBe('?page=2');
    expect(router.state.historyAction).toBe('POP');
  });

  it('gives the search of the list as the address writes it, to carry it to the detail (US1-4)', () => {
    expect(setup('/users?page=3&page_size=25').result.current.search).toBe('?page=3&page_size=25');
    expect(setup('/users?status_id=2&type_id=1&page=2').result.current.search).toBe(
      '?type_id=1&status_id=2&page=2',
    );
    expect(setup('/users').result.current.search).toBe('');
    expect(setup('/users?email=ana@clinica.com').result.current.search).toBe(
      '?email=ana%40clinica.com',
    );
  });

  describe('the actions of the person', () => {
    it('goes to another page keeping the page size, adding an entry to the history', () => {
      const { result, router } = setup('/users?page_size=25');

      act(() => {
        result.current.setPage(3);
      });

      expect(router.state.location.search).toBe('?page=3&page_size=25');
      expect(router.state.historyAction).toBe('PUSH');
      expect(result.current.location).toEqual({ mode: 'list', page: 3, pageSize: 25, ...DEFAULTS });
    });

    it('can go to a page replacing the entry, as when the page asked for does not exist', () => {
      const { result, router } = setup('/users?page=99');

      act(() => {
        result.current.setPage(4, { replace: true });
      });

      expect(router.state.location.search).toBe('?page=4');
      expect(router.state.historyAction).toBe('REPLACE');
    });

    it('goes back to the first page when the page size changes (US1-2)', () => {
      const { result, router } = setup('/users?page=4');

      act(() => {
        result.current.setPageSize(25);
      });

      expect(router.state.location.search).toBe('?page_size=25');
      expect(result.current.location).toEqual({ mode: 'list', page: 1, pageSize: 25, ...DEFAULTS });
    });

    it('keeps the filters when it changes the page or the page size', () => {
      const { result, router } = setup('/users?type_id=1&status_id=2&page=2');

      act(() => {
        result.current.setPage(3);
      });
      expect(router.state.location.search).toBe('?type_id=1&status_id=2&page=3');

      act(() => {
        result.current.setPageSize(50);
      });
      expect(router.state.location.search).toBe('?type_id=1&status_id=2&page_size=50');
    });

    it('goes back to the first page, with the same page size, when a filter changes (FR-008)', () => {
      const { result, router } = setup('/users?page=3&page_size=25');

      act(() => {
        result.current.setType('system');
      });
      expect(router.state.location.search).toBe('?type_id=1&page_size=25');
      expect(router.state.historyAction).toBe('PUSH');

      act(() => {
        result.current.setStatus('blocked');
      });
      expect(router.state.location.search).toBe('?type_id=1&status_id=2&page_size=25');

      act(() => {
        result.current.setType('all');
      });
      expect(router.state.location.search).toBe('?status_id=2&page_size=25');

      act(() => {
        result.current.setStatus('active');
      });
      expect(router.state.location.search).toBe('?page_size=25');
    });

    it('ends a search when a filter is pressed, and shows the filtered list (research D4)', () => {
      const { result, router } = setup('/users?email=ana@clinica.com&type_id=2');

      act(() => {
        result.current.setStatus('blocked');
      });

      expect(router.state.location.search).toBe('?type_id=2&status_id=2');
      expect(result.current.location).toEqual({
        mode: 'list',
        page: 1,
        pageSize: 10,
        type: 'clinic',
        status: 'blocked',
      });
    });

    it('searches by email and clears the search to go back to the list', () => {
      const { result, router } = setup('/users?page=2');

      act(() => {
        result.current.searchEmail('ana@clinica.com');
      });
      expect(router.state.location.search).toBe('?email=ana%40clinica.com');
      expect(result.current.location).toEqual({
        mode: 'search',
        email: 'ana@clinica.com',
        ...DEFAULTS,
      });

      act(() => {
        result.current.clearSearch();
      });
      expect(router.state.location.search).toBe('');
      expect(result.current.location).toEqual({ mode: 'list', page: 1, pageSize: 10, ...DEFAULTS });
    });

    it('keeps the filters while it searches and when it clears the search (FR-011)', () => {
      const { result, router } = setup('/users?type_id=2&status_id=2&page=3');

      act(() => {
        result.current.searchEmail('ana@clinica.com');
      });
      expect(router.state.location.search).toBe('?email=ana%40clinica.com&type_id=2&status_id=2');

      act(() => {
        result.current.clearSearch();
      });
      expect(router.state.location.search).toBe('?type_id=2&status_id=2');
    });

    it('trims the email it searches for', () => {
      const { result, router } = setup('/users');

      act(() => {
        result.current.searchEmail('  ana@clinica.com ');
      });

      expect(router.state.location.search).toBe('?email=ana%40clinica.com');
    });
  });
});
