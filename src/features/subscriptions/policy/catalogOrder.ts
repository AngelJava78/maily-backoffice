import { toCents } from '../schemas/price';
import type { Subscription } from '../schemas/subscription';
import { isActiveSubscription } from '../schemas/subscriptionStatus';

// Created once: Spanish order, without telling the upper case apart ("pro" and "Pro" tie).
const NAME_ORDER = new Intl.Collator('es', { sensitivity: 'accent' });

function groupOf(subscription: Subscription): number {
  return isActiveSubscription(subscription.status.id) ? 0 : 1;
}

/**
 * The fixed order of the list (FR-015): the active subscriptions first and every other status
 * after them, each group by monthly price from the lowest, a tie of price by name and, last, by id,
 * so the order is total and the pages never change between two renders. The operator cannot change
 * it. It returns a new list.
 */
export function sortCatalog(items: readonly Subscription[]): readonly Subscription[] {
  return [...items].sort(
    (first, second) =>
      groupOf(first) - groupOf(second) ||
      toCents(first.monthlyPrice) - toCents(second.monthlyPrice) ||
      NAME_ORDER.compare(first.name, second.name) ||
      first.id - second.id,
  );
}

/** One page of the sorted catalog, as the list shows it. */
export interface CatalogPage {
  readonly items: readonly Subscription[];
  readonly total: number;
  /** 0 with an empty catalog. */
  readonly pages: number;
  /** The page shown: the one asked for or, when it does not exist, the last one (1 if empty). */
  readonly page: number;
  /** The page asked for did not exist: the list replaces the address with the one it shows. */
  readonly pageWasClamped: boolean;
}

/**
 * The page of the catalog that the address asks for. The API returns the whole catalog without
 * pages, so it is cut here (a deviation from principle IV justified in the plan).
 */
export function pageOf(
  sorted: readonly Subscription[],
  page: number,
  pageSize: number,
): CatalogPage {
  const total = sorted.length;
  const pages = Math.ceil(total / pageSize);
  const shown = Math.min(Math.max(page, 1), Math.max(pages, 1));
  return {
    items: sorted.slice((shown - 1) * pageSize, shown * pageSize),
    total,
    pages,
    page: shown,
    pageWasClamped: shown !== page,
  };
}
