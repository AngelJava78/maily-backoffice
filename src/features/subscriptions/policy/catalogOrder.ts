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
