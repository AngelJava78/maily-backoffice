import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  parseComponentsSearchParams,
  toComponentsSearchParams,
  type ComponentsLocation,
} from '../schemas/componentsLocation';

export interface ComponentsLocationApi {
  /** What the address asks for: a page of the registry and its size. */
  readonly location: ComponentsLocation;
  /** Goes to a page, keeping its size. `replace` does not add a history entry. */
  readonly setPage: (page: number, options?: { readonly replace?: boolean }) => void;
  /** Changes the page size, which takes the list back to the first page. */
  readonly setPageSize: (pageSize: number) => void;
}

/**
 * The page of the registry lives in the address (FR-034; constitution III), so it can be shared,
 * reloaded and gone back to. An address with values that are not valid is replaced by its normal
 * form, without adding an entry to the history.
 */
export function useComponentsLocation(): ComponentsLocationApi {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = parseComponentsSearchParams(searchParams);
  const current = searchParams.toString();
  const canonical = toComponentsSearchParams(location).toString();

  useEffect(() => {
    if (current !== canonical) {
      setSearchParams(new URLSearchParams(canonical), { replace: true });
    }
  }, [current, canonical, setSearchParams]);

  return {
    location,
    setPage: (page, options) => {
      setSearchParams(toComponentsSearchParams({ page, pageSize: location.pageSize }), {
        replace: options?.replace === true,
      });
    },
    setPageSize: (nextPageSize) => {
      // The sizes the list offers are the only ones accepted: anything else becomes the default.
      const { pageSize } = parseComponentsSearchParams(
        new URLSearchParams({ pageSize: String(nextPageSize) }),
      );
      setSearchParams(toComponentsSearchParams({ page: 1, pageSize }));
    },
  };
}
