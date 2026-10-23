import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  parseRolePermissionsSearchParams,
  toRolePermissionsSearchParams,
  type RolePermissionsLocation,
  type RoleTypeTab,
} from '../schemas/rolePermissionsLocation';

export interface RolePermissionsLocationApi {
  readonly location: RolePermissionsLocation;
  /** Changes the active tab; always clears the selected role (research D5: it belongs to the other tab). */
  readonly setType: (type: RoleTypeTab) => void;
  /** Selects a role within the active tab, or clears the selection with `null`. */
  readonly setRoleId: (roleId: number | null) => void;
}

/**
 * The state of `/roles` lives in the address (constitution III): which tab and which role, so both
 * are shareable, survive a reload and work with the Back button. An address with an invalid value
 * is replaced by its normal form, without adding a history entry.
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
      setSearchParams(toRolePermissionsSearchParams({ type, roleId: null }));
    },
    setRoleId: (roleId) => {
      setSearchParams(toRolePermissionsSearchParams({ type: location.type, roleId }));
    },
  };
}
