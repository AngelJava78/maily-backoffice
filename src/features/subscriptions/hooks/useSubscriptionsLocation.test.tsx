import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createWrapper } from '@/test/renderWithProviders';

import { DEFAULT_SORT } from '../schemas/subscriptionsLocation';
import { SUBSCRIPTION_TYPE } from '../schemas/subscriptionTypeCatalog';
import { useSubscriptionsLocation } from './useSubscriptionsLocation';

const DEFAULT_FIELDS = { sort: DEFAULT_SORT, comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL };

function setup(route: string) {
  const { wrapper, router } = createWrapper({ route });
  const { result } = renderHook(() => useSubscriptionsLocation(), { wrapper });
  return { result, router };
}

describe('useSubscriptionsLocation', () => {
  it('reads the page and the page size from the address', () => {
    const { result } = setup('/subscriptions?page=2&page_size=25');

    expect(result.current.location).toEqual({
      page: 2,
      pageSize: 25,
      tab: 'list',
      ...DEFAULT_FIELDS,
    });
  });

  it('reads the Comparativo tab from the address', () => {
    const { result } = setup('/subscriptions?tab=comparison');

    expect(result.current.location.tab).toBe('comparison');
  });

  it('normalizes an address with invalid values, replacing it so the history gets no new entry', async () => {
    const { result, router } = setup('/subscriptions?page=abc&page_size=7&foo=bar');

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(result.current.location).toEqual({
      page: 1,
      pageSize: 10,
      tab: 'list',
      ...DEFAULT_FIELDS,
    });
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
      expect(result.current.location).toEqual({
        page: 3,
        pageSize: 25,
        tab: 'list',
        ...DEFAULT_FIELDS,
      });
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
      expect(result.current.location).toEqual({
        page: 1,
        pageSize: 25,
        tab: 'list',
        ...DEFAULT_FIELDS,
      });
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
      expect(result.current.location).toEqual({
        page: 1,
        pageSize: 10,
        tab: 'comparison',
        ...DEFAULT_FIELDS,
      });
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

    it('changes the order of the list, going back to the first page (020, research D9)', () => {
      const { result, router } = setup('/subscriptions?page=3');

      act(() => {
        result.current.setSort({ field: 'name', direction: 'desc' });
      });

      expect(router.state.location.search).toBe('?sort=-name');
      expect(result.current.location).toEqual({
        page: 1,
        pageSize: 10,
        tab: 'list',
        sort: { field: 'name', direction: 'desc' },
        comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
      });
    });

    it('changes the type filter of the Comparativo, without touching the pagination (020)', () => {
      const { result, router } = setup('/subscriptions?tab=comparison&page=2');

      act(() => {
        result.current.setComparisonType(SUBSCRIPTION_TYPE.ENTERPRISE);
      });

      expect(router.state.location.search).toBe('?page=2&tab=comparison&type_id=2');
      expect(result.current.location.comparisonType).toBe(SUBSCRIPTION_TYPE.ENTERPRISE);
      expect(result.current.location.page).toBe(2);
    });
  });
});
