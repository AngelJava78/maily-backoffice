import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  parseModulesSearchParams,
  toModulesSearchParams,
  type ModulesLocation,
  type ModulesStatusFilter,
  type ModulesTypeFilter,
} from '../schemas/modulesLocation';

export interface ModulesLocationApi {
  readonly location: ModulesLocation;
  readonly setType: (type: ModulesTypeFilter) => void;
  readonly setStatus: (status: ModulesStatusFilter) => void;
  readonly setSearch: (search: string) => void;
  readonly openEdit: (moduleId: number) => void;
  readonly openCreate: () => void;
  readonly closePanel: () => void;
}

/**
 * The state of the Módulos screen lives in the address (constitution III, research D10): filters,
 * search and which panel is open, so it can be shared, reloaded and gone back to. An address with
 * values that are not valid is replaced by its normal form, without adding an entry to the history
 * (same pattern as `useSubscriptionsLocation`).
 */
export function useModulesLocation(): ModulesLocationApi {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = parseModulesSearchParams(searchParams);
  const current = searchParams.toString();
  const canonical = toModulesSearchParams(location).toString();

  useEffect(() => {
    if (current !== canonical) {
      setSearchParams(new URLSearchParams(canonical), { replace: true });
    }
  }, [current, canonical, setSearchParams]);

  return {
    location,
    setType: (type) => {
      setSearchParams(toModulesSearchParams({ ...location, type }));
    },
    setStatus: (status) => {
      setSearchParams(toModulesSearchParams({ ...location, status }));
    },
    setSearch: (search) => {
      setSearchParams(toModulesSearchParams({ ...location, search }));
    },
    openEdit: (moduleId) => {
      setSearchParams(toModulesSearchParams({ ...location, panel: { kind: 'edit', moduleId } }));
    },
    openCreate: () => {
      setSearchParams(toModulesSearchParams({ ...location, panel: { kind: 'create' } }));
    },
    closePanel: () => {
      setSearchParams(toModulesSearchParams({ ...location, panel: { kind: 'none' } }));
    },
  };
}
