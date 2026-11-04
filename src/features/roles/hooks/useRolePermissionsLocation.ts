import { useEffect, useRef } from 'react';
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

  // What the last action asked for, until the address shows it. The router only gives the new
  // address on the next render, so without it a second action right after the first (a filter and
  // then the other) would start from the old address and undo the first one.
  const requested = useRef<RolePermissionsLocation | null>(null);

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
  function latest(): RolePermissionsLocation {
    return requested.current ?? location;
  }

  function go(next: RolePermissionsLocation, options?: { readonly replace?: boolean }): void {
    requested.current = next;
    setSearchParams(toRolePermissionsSearchParams(next), { replace: options?.replace === true });
  }

  return {
    location,
    search: locationSearch(location),
    setType: (type) => {
      go({ ...latest(), type, page: 1 });
    },
    setStatus: (status) => {
      go({ ...latest(), status, page: 1 });
    },
    setPage: (page, options) => {
      go({ ...latest(), page }, options);
    },
    setPageSize: (nextPageSize) => {
      // The sizes the table offers are the only ones accepted: anything else becomes the default.
      const { pageSize } = parseRolePermissionsSearchParams(
        new URLSearchParams({ page_size: String(nextPageSize) }),
      );
      go({ ...latest(), pageSize, page: 1 });
    },
  };
}
