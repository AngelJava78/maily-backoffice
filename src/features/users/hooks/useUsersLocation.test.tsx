import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createWrapper } from '@/test/renderWithProviders';

import { useUsersLocation } from './useUsersLocation';

function setup(route: string) {
  const { wrapper, router } = createWrapper({ route });
  const { result } = renderHook(() => useUsersLocation(), { wrapper });
  return { result, router };
}

describe('useUsersLocation', () => {
  it('reads the list from the address: the page and the page size', () => {
    const { result } = setup('/users?page=2&page_size=25');

    expect(result.current.location).toEqual({ mode: 'list', page: 2, pageSize: 25 });
  });

  it('reads a search by email from the address', () => {
    const { result } = setup('/users?email=ana@clinica.com');

    expect(result.current.location).toEqual({ mode: 'search', email: 'ana@clinica.com' });
  });

  it('normalizes an address with invalid values, replacing it so the history gets no new entry', async () => {
    const { result, router } = setup('/users?page=abc&page_size=7');

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(result.current.location).toEqual({ mode: 'list', page: 1, pageSize: 10 });
  });

  it('leaves an address that is already normal as it is', () => {
    const { router } = setup('/users?page=2');

    expect(router.state.location.search).toBe('?page=2');
    expect(router.state.historyAction).toBe('POP');
  });

  it('gives the search of the list as the address writes it, to carry it to the detail (US1-4)', () => {
    expect(setup('/users?page=3&page_size=25').result.current.search).toBe('?page=3&page_size=25');
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
      expect(result.current.location).toEqual({ mode: 'list', page: 3, pageSize: 25 });
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
      expect(result.current.location).toEqual({ mode: 'list', page: 1, pageSize: 25 });
    });

    it('searches by email and clears the search to go back to the list', () => {
      const { result, router } = setup('/users?page=2');

      act(() => {
        result.current.searchEmail('ana@clinica.com');
      });
      expect(router.state.location.search).toBe('?email=ana%40clinica.com');
      expect(result.current.location).toEqual({ mode: 'search', email: 'ana@clinica.com' });

      act(() => {
        result.current.clearSearch();
      });
      expect(router.state.location.search).toBe('');
      expect(result.current.location).toEqual({ mode: 'list', page: 1, pageSize: 10 });
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
