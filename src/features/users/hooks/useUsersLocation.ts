import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  DEFAULT_PAGE_SIZE,
  parseUsersSearchParams,
  toUsersSearchParams,
  type UsersLocation,
} from '../schemas/usersLocation';

export interface UsersLocationApi {
  /** What the address asks for: a page of the list or a search by email. */
  readonly location: UsersLocation;
  /**
   * The search of the address as the list writes it (`?page=3&page_size=25`, or an empty text), to
   * hand it to the detail so that it can come back to the same page (US1-4).
   */
  readonly search: string;
  /** Goes to a page of the list, keeping the page size. `replace` does not add a history entry. */
  readonly setPage: (page: number, options?: { readonly replace?: boolean }) => void;
  /** Changes the page size, which takes the list back to the first page (US1-2). */
  readonly setPageSize: (pageSize: number) => void;
  readonly searchEmail: (email: string) => void;
  /** Leaves the search and goes back to the list. */
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

  return {
    location,
    search: canonical === '' ? '' : `?${canonical}`,
    setPage: (page, options) => {
      setSearchParams(toUsersSearchParams({ mode: 'list', page, pageSize }), {
        replace: options?.replace === true,
      });
    },
    setPageSize: (nextPageSize) => {
      // The sizes the list offers are the only ones accepted: anything else becomes the default.
      const accepted = parseUsersSearchParams(
        new URLSearchParams({ page_size: String(nextPageSize) }),
      );
      if (accepted.mode === 'list') {
        setSearchParams(toUsersSearchParams({ ...accepted, page: 1 }));
      }
    },
    searchEmail: (email) => {
      setSearchParams(toUsersSearchParams({ mode: 'search', email: email.trim() }));
    },
    clearSearch: () => {
      setSearchParams(toUsersSearchParams({ mode: 'list', page: 1, pageSize: DEFAULT_PAGE_SIZE }));
    },
  };
}
