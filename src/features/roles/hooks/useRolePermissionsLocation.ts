import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  locationSearch,
  parseRolePermissionsSearchParams,
  toRolePermissionsSearchParams,
  type RolePermissionsLocation,
  type RolesStatusFilter,
  type RolesTypeFilter,
} from '../schemas/rolePermissionsLocation';

export interface RolePermissionsLocationApi {
  /** What the address of the table asks for: both filters, the page and its size. */
  readonly location: RolePermissionsLocation;
  /**
   * The search of the address as the table writes it (`?type=sistema&page=2`, or an empty text), to
   * hand it to the detail of a role so that it can come back to the same table (research D6).
   */
  readonly search: string;
  /** Changes the Tipo filter, keeping Estatus and the page size; goes to the first page (FR-007). */
  readonly setType: (type: RolesTypeFilter) => void;
  /** Changes the Estatus filter, keeping Tipo and the page size; goes to the first page (FR-007). */
  readonly setStatus: (status: RolesStatusFilter) => void;
  /** Goes to a page of the table, keeping the filters and the page size. `replace` adds no entry. */
  readonly setPage: (page: number, options?: { readonly replace?: boolean }) => void;
  /** Changes the page size, which takes the table back to the first page (FR-008). */
  readonly setPageSize: (pageSize: number) => void;
}

/**
 * The state of the table of `/roles` lives in the address (constitution III): both filters, the
 * page and its size, so they are shareable, survive a reload and work with the Back button. An
 * address with a value that is not valid, or with an old `roleId` (which `RolesPage` redirects
 * before it gets here), is replaced by its normal form, without adding a history entry; that is
 * the only effect, and its subject is the address, an external system.
 */
export function useRolePermissionsLocation(): RolePermissionsLocationApi {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = parseRolePermissionsSearchParams(searchParams);
  const current = searchParams.toString();
  const canonical = toRolePermissionsSearchParams(location).toString();

  useEffect(() => {
    if (current !== canonical) {
      setSearchParams(new URLSearchParams(canonical), { replace: true });
    }
  }, [current, canonical, setSearchParams]);

  return {
    location,
    search: locationSearch(location),
    setType: (type) => {
      setSearchParams(toRolePermissionsSearchParams({ ...location, type, page: 1 }));
    },
    setStatus: (status) => {
      setSearchParams(toRolePermissionsSearchParams({ ...location, status, page: 1 }));
    },
    setPage: (page, options) => {
      setSearchParams(toRolePermissionsSearchParams({ ...location, page }), {
        replace: options?.replace === true,
      });
    },
    setPageSize: (nextPageSize) => {
      // The sizes the table offers are the only ones accepted: anything else becomes the default.
      const { pageSize } = parseRolePermissionsSearchParams(
        new URLSearchParams({ page_size: String(nextPageSize) }),
      );
      setSearchParams(toRolePermissionsSearchParams({ ...location, pageSize, page: 1 }));
    },
  };
}
