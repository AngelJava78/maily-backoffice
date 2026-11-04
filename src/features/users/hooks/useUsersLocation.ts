import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

import {
  DEFAULT_PAGE_SIZE,
  parseUsersSearchParams,
  toUsersSearchParams,
  type UsersLocation,
  type UsersStatusFilter,
  type UsersTypeFilter,
} from '../schemas/usersLocation';

export interface UsersLocationApi {
  /** What the address asks for: a page of the list or a search by email. */
  readonly location: UsersLocation;
  /**
   * The search of the address as the list writes it (`?type_id=2&page=3`, or an empty text), to
   * hand it to the detail so that it can come back to the same page and filters (US1-4, FR-012).
   */
  readonly search: string;
  /** Goes to a page of the list, keeping the page size. `replace` does not add a history entry. */
  readonly setPage: (page: number, options?: { readonly replace?: boolean }) => void;
  /** Changes the page size, which takes the list back to the first page (US1-2). */
  readonly setPageSize: (pageSize: number) => void;
  /**
   * Changes a filter (feature 026): the list goes back to the first page with the same page size
   * (FR-008). During a search it ends the search and shows the filtered list (research D4).
   */
  readonly setType: (type: UsersTypeFilter) => void;
  readonly setStatus: (status: UsersStatusFilter) => void;
  /** Searches by email; the filters stay in the address (FR-011). */
  readonly searchEmail: (email: string) => void;
  /** Leaves the search and goes back to the list, with the filters it had (FR-011). */
  readonly clearSearch: () => void;
}

/**
 * The state of the list of users lives in the address (constitution III), so it can be shared,
 * reloaded and gone back to. An address with values that are not valid is replaced by its normal
 * form, without adding an entry to the history; that is the only effect, and its subject is the
 * address, an external system.
 */
export function useUsersLocation(): UsersLocationApi {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = parseUsersSearchParams(searchParams);
  const current = searchParams.toString();
  const canonical = toUsersSearchParams(location).toString();
  // What the last action asked for, until the address shows it. The router only gives the new
  // address on the next render, so without it a second action right after the first (a filter and
  // then the other) would start from the old address and undo the first one.
  const requested = useRef<UsersLocation | null>(null);

  useEffect(() => {
    if (current !== canonical) {
      setSearchParams(new URLSearchParams(canonical), { replace: true });
    }
  }, [current, canonical, setSearchParams]);

  // Once the address changes (by an action, Back or a link), it is the one to start from.
  useEffect(() => {
    requested.current = null;
  }, [current]);

  /** Where the next action starts from: what was last asked for, or else the address. */
  function latest(): UsersLocation {
    return requested.current ?? location;
  }

  function go(next: UsersLocation, options?: { readonly replace?: boolean }): void {
    requested.current = next;
    setSearchParams(toUsersSearchParams(next), { replace: options?.replace === true });
  }

  /** The list with the page size and the filters of `from`, and the changes given. */
  function list(
    from: UsersLocation,
    changes: Partial<Extract<UsersLocation, { mode: 'list' }>>,
  ): UsersLocation {
    return {
      mode: 'list',
      page: 1,
      pageSize: from.mode === 'list' ? from.pageSize : DEFAULT_PAGE_SIZE,
      type: from.type,
      status: from.status,
      ...changes,
    };
  }

  return {
    location,
    search: canonical === '' ? '' : `?${canonical}`,
    setPage: (page, options) => {
      go(list(latest(), { page }), options);
    },
    setPageSize: (nextPageSize) => {
      // The sizes the list offers are the only ones accepted: anything else becomes the default.
      const accepted = parseUsersSearchParams(
        new URLSearchParams({ page_size: String(nextPageSize) }),
      );
      if (accepted.mode === 'list') {
        go(list(latest(), { pageSize: accepted.pageSize }));
      }
    },
    setType: (type) => {
      go(list(latest(), { type }));
    },
    setStatus: (status) => {
      go(list(latest(), { status }));
    },
    searchEmail: (email) => {
      const { type, status } = latest();
      go({ mode: 'search', email: email.trim(), type, status });
    },
    clearSearch: () => {
      const { type, status } = latest();
      go({ mode: 'list', page: 1, pageSize: DEFAULT_PAGE_SIZE, type, status });
    },
  };
}
