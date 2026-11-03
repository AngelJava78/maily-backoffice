import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  locationAfterCreate,
  parseRolePermissionsSearchParams,
  toRolePermissionsSearchParams,
  type RolePermissionsLocation,
  type RolesStatusFilter,
  type RolesTypeFilter,
} from '../schemas/rolePermissionsLocation';

export interface RolePermissionsLocationApi {
  readonly location: RolePermissionsLocation;
  /** Changes the Tipo filter, keeping Estatus; always clears the selected role (FR-007). */
  readonly setType: (type: RolesTypeFilter) => void;
  /** Changes the Estatus filter, keeping Tipo; always clears the selected role (FR-007). */
  readonly setStatus: (status: RolesStatusFilter) => void;
  /** Selects a role within the current filters, or clears the selection with `null`. */
  readonly setRoleId: (roleId: number | null) => void;
  /** Selects a role just created or duplicated, adjusting the filters so it is shown (FR-010). */
  readonly selectCreated: (role: {
    readonly id: number;
    readonly type: { readonly id: 1 | 2 };
  }) => void;
}

/**
 * The state of `/roles` lives in the address (constitution III): both filters and which role, so
 * they are shareable, survive a reload and work with the Back button. An address with an invalid
 * value is replaced by its normal form, without adding a history entry.
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
    setType: (type) => {
      setSearchParams(toRolePermissionsSearchParams({ ...location, type, roleId: null }));
    },
    setStatus: (status) => {
      setSearchParams(toRolePermissionsSearchParams({ ...location, status, roleId: null }));
    },
    setRoleId: (roleId) => {
      setSearchParams(toRolePermissionsSearchParams({ ...location, roleId }));
    },
    selectCreated: (role) => {
      setSearchParams(toRolePermissionsSearchParams(locationAfterCreate(location, role)));
    },
  };
}
