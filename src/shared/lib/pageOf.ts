/** One page of a whole list, as a list shows it. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  /** 0 with an empty list. */
  readonly pages: number;
  /** The page shown: the one asked for or, when it does not exist, the last one (1 if empty). */
  readonly page: number;
  /** The page asked for did not exist: the list replaces the address with the one it shows. */
  readonly pageWasClamped: boolean;
}

/**
 * The page of a whole list that the address asks for. For the lists whose API returns everything
 * without pages, so they are cut here: the subscriptions (feature 003) and the registry of
 * components (feature 016), deviations from principle IV justified in their plans.
 */
export function pageOf<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const total = items.length;
  const pages = Math.ceil(total / pageSize);
  const shown = Math.min(Math.max(page, 1), Math.max(pages, 1));
  return {
    items: items.slice((shown - 1) * pageSize, shown * pageSize),
    total,
    pages,
    page: shown,
    pageWasClamped: shown !== page,
  };
}
