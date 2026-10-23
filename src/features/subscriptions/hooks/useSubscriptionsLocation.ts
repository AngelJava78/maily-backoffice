import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  parseSubscriptionsSearchParams,
  toSubscriptionsSearchParams,
  type SubscriptionsLocation,
} from '../schemas/subscriptionsLocation';

export interface SubscriptionsLocationApi {
  /** What the address asks for: a page of the list and its size. */
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
      setSearchParams(
        toSubscriptionsSearchParams({ page, pageSize: location.pageSize, tab: location.tab }),
        { replace: options?.replace === true },
      );
    },
    setPageSize: (nextPageSize) => {
      // The sizes the list offers are the only ones accepted: anything else becomes the default.
      const { pageSize } = parseSubscriptionsSearchParams(
        new URLSearchParams({ page_size: String(nextPageSize) }),
      );
      setSearchParams(toSubscriptionsSearchParams({ page: 1, pageSize, tab: location.tab }));
    },
  };
}
