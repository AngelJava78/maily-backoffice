import { useEffect, useRef } from 'react';
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

  // What the last action asked for, until the address shows it. The router only gives the new
  // address on the next render, so without it a second action right after the first (a filter and
  // then the other) would start from the old address and undo the first one.
  const requested = useRef<ModulesLocation | null>(null);

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
  function latest(): ModulesLocation {
    return requested.current ?? location;
  }

  function go(next: ModulesLocation): void {
    requested.current = next;
    setSearchParams(toModulesSearchParams(next));
  }

  return {
    location,
    setType: (type) => {
      go({ ...latest(), type });
    },
    setStatus: (status) => {
      go({ ...latest(), status });
    },
    setSearch: (search) => {
      go({ ...latest(), search });
    },
    openEdit: (moduleId) => {
      go({ ...latest(), panel: { kind: 'edit', moduleId } });
    },
    openCreate: () => {
      go({ ...latest(), panel: { kind: 'create' } });
    },
    closePanel: () => {
      go({ ...latest(), panel: { kind: 'none' } });
    },
  };
}
