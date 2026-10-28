import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  parseSubscriptionsSearchParams,
  toSubscriptionsSearchParams,
  type SubscriptionsLocation,
  type SubscriptionsSort,
  type SubscriptionsTab,
} from '../schemas/subscriptionsLocation';
import type { SubscriptionTypeId } from '../schemas/subscriptionTypeCatalog';

export interface SubscriptionsLocationApi {
  /**
   * What the address asks for: a page of the list, its size, the active tab, the order of the
   * Listado (020) and the type filter of the Comparativo (020).
   */
  readonly location: SubscriptionsLocation;
  /**
   * The search of the address as the list writes it (`?page=2&page_size=25`, or an empty text), to
   * hand it to the detail so that it can come back to the same page (US1-8).
   */
  readonly search: string;
  /** Goes to a page of the list, keeping the page size. `replace` does not add a history entry. */
  readonly setPage: (page: number, options?: { readonly replace?: boolean }) => void;
  /** Changes the page size, which takes the list back to the first page (US1-2). */
  readonly setPageSize: (pageSize: number) => void;
  /** Switches between Listado and Comparativo, keeping the page and its size (research D8). */
  readonly setTab: (tab: SubscriptionsTab) => void;
  /** Changes the order of the Listado, which takes it back to the first page (020, research D9). */
  readonly setSort: (sort: SubscriptionsSort) => void;
  /** Changes the type filter of the Comparativo; it does not paginate, so nothing else moves (020). */
  readonly setComparisonType: (type: SubscriptionTypeId) => void;
}

/**
 * The state of the list of subscriptions lives in the address (constitution III), so it can be
 * shared, reloaded and gone back to. An address with values that are not valid is replaced by its
 * normal form, without adding an entry to the history; that is the only effect, and its subject is
 * the address, an external system.
 */
export function useSubscriptionsLocation(): SubscriptionsLocationApi {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = parseSubscriptionsSearchParams(searchParams);
  const current = searchParams.toString();
  const canonical = toSubscriptionsSearchParams(location).toString();

  useEffect(() => {
    if (current !== canonical) {
      setSearchParams(new URLSearchParams(canonical), { replace: true });
    }
  }, [current, canonical, setSearchParams]);

  return {
    location,
    search: canonical === '' ? '' : `?${canonical}`,
    setPage: (page, options) => {
      setSearchParams(toSubscriptionsSearchParams({ ...location, page }), {
        replace: options?.replace === true,
      });
    },
    setPageSize: (nextPageSize) => {
      // The sizes the list offers are the only ones accepted: anything else becomes the default.
      const { pageSize } = parseSubscriptionsSearchParams(
        new URLSearchParams({ page_size: String(nextPageSize) }),
      );
      setSearchParams(toSubscriptionsSearchParams({ ...location, page: 1, pageSize }));
    },
    setTab: (tab) => {
      setSearchParams(toSubscriptionsSearchParams({ ...location, tab }));
    },
    setSort: (sort) => {
      setSearchParams(toSubscriptionsSearchParams({ ...location, page: 1, sort }));
    },
    setComparisonType: (comparisonType) => {
      setSearchParams(toSubscriptionsSearchParams({ ...location, comparisonType }));
    },
  };
}
