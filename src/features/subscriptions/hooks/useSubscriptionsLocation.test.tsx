import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createWrapper } from '@/test/renderWithProviders';

import { useSubscriptionsLocation } from './useSubscriptionsLocation';

function setup(route: string) {
  const { wrapper, router } = createWrapper({ route });
  const { result } = renderHook(() => useSubscriptionsLocation(), { wrapper });
  return { result, router };
}

describe('useSubscriptionsLocation', () => {
  it('reads the page and the page size from the address', () => {
    const { result } = setup('/subscriptions?page=2&page_size=25');

    expect(result.current.location).toEqual({ page: 2, pageSize: 25, tab: 'list' });
  });

  it('reads the Comparativo tab from the address', () => {
    const { result } = setup('/subscriptions?tab=comparison');

    expect(result.current.location.tab).toBe('comparison');
  });

  it('normalizes an address with invalid values, replacing it so the history gets no new entry', async () => {
    const { result, router } = setup('/subscriptions?page=abc&page_size=7&sort=name');

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(result.current.location).toEqual({ page: 1, pageSize: 10, tab: 'list' });
  });

  it('leaves an address that is already normal as it is', () => {
    const { router } = setup('/subscriptions?page=2');

    expect(router.state.location.search).toBe('?page=2');
    expect(router.state.historyAction).toBe('POP');
  });

  it('gives the search of the list as the address writes it, to carry it to the detail (US1-8)', () => {
    expect(setup('/subscriptions?page=3&page_size=25').result.current.search).toBe(
      '?page=3&page_size=25',
    );
    expect(setup('/subscriptions').result.current.search).toBe('');
  });

  describe('the actions of the person', () => {
    it('goes to another page keeping the page size, adding an entry to the history', () => {
      const { result, router } = setup('/subscriptions?page_size=25');

      act(() => {
        result.current.setPage(3);
      });

      expect(router.state.location.search).toBe('?page=3&page_size=25');
      expect(router.state.historyAction).toBe('PUSH');
      expect(result.current.location).toEqual({ page: 3, pageSize: 25, tab: 'list' });
    });

    it('can go to a page replacing the entry, as when the page asked for does not exist', () => {
      const { result, router } = setup('/subscriptions?page=99');

      act(() => {
        result.current.setPage(2, { replace: true });
      });

      expect(router.state.location.search).toBe('?page=2');
      expect(router.state.historyAction).toBe('REPLACE');
    });

    it('goes back to the first page when the page size changes (US1-2)', () => {
      const { result, router } = setup('/subscriptions?page=2');

      act(() => {
        result.current.setPageSize(25);
      });

      expect(router.state.location.search).toBe('?page_size=25');
      expect(result.current.location).toEqual({ page: 1, pageSize: 25, tab: 'list' });
    });

    it('takes a page size that the list does not offer as the default one', () => {
      const { result, router } = setup('/subscriptions?page=2&page_size=25');

      act(() => {
        result.current.setPageSize(7);
      });

      expect(router.state.location.search).toBe('');
    });

    it('goes to the Comparativo tab, adding an entry to the history', () => {
      const { result, router } = setup('/subscriptions');

      act(() => {
        result.current.setTab('comparison');
      });

      expect(router.state.location.search).toBe('?tab=comparison');
      expect(router.state.historyAction).toBe('PUSH');
      expect(result.current.location).toEqual({ page: 1, pageSize: 10, tab: 'comparison' });
    });

    it('goes back to the Listado tab, which leaves no parameter in the address', () => {
      const { result, router } = setup('/subscriptions?tab=comparison');

      act(() => {
        result.current.setTab('list');
      });

      expect(router.state.location.search).toBe('');
    });

    it('keeps the active tab when changing the page or the page size', () => {
      const { result, router } = setup('/subscriptions?tab=comparison');

      act(() => {
        result.current.setPage(2);
      });

      expect(router.state.location.search).toBe('?page=2&tab=comparison');
      expect(result.current.location.tab).toBe('comparison');
    });
  });
});
