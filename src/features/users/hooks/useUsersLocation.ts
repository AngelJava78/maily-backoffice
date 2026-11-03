import { useEffect } from 'react';
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

  useEffect(() => {
    if (current !== canonical) {
      setSearchParams(new URLSearchParams(canonical), { replace: true });
    }
  }, [current, canonical, setSearchParams]);

  const pageSize = location.mode === 'list' ? location.pageSize : DEFAULT_PAGE_SIZE;
  const filters = { type: location.type, status: location.status };

  return {
    location,
    search: canonical === '' ? '' : `?${canonical}`,
    setPage: (page, options) => {
      setSearchParams(toUsersSearchParams({ mode: 'list', page, pageSize, ...filters }), {
        replace: options?.replace === true,
      });
    },
    setPageSize: (nextPageSize) => {
      // The sizes the list offers are the only ones accepted: anything else becomes the default.
      const accepted = parseUsersSearchParams(
        new URLSearchParams({ page_size: String(nextPageSize) }),
      );
      if (accepted.mode === 'list') {
        setSearchParams(toUsersSearchParams({ ...accepted, page: 1, ...filters }));
      }
    },
    setType: (type) => {
      setSearchParams(toUsersSearchParams({ mode: 'list', page: 1, pageSize, ...filters, type }));
    },
    setStatus: (status) => {
      setSearchParams(toUsersSearchParams({ mode: 'list', page: 1, pageSize, ...filters, status }));
    },
    searchEmail: (email) => {
      setSearchParams(toUsersSearchParams({ mode: 'search', email: email.trim(), ...filters }));
    },
    clearSearch: () => {
      setSearchParams(
        toUsersSearchParams({ mode: 'list', page: 1, pageSize: DEFAULT_PAGE_SIZE, ...filters }),
      );
    },
  };
}
