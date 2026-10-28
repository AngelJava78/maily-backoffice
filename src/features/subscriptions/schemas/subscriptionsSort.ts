import { toCents } from './price';
import type { Subscription } from './subscription';
import type { SubscriptionsSort, SubscriptionsSortField } from './subscriptionsLocation';

/** The comparable value of a field, for sorting (research D7, D10): numbers compare exactly. */
function valueOf(
  subscription: Subscription,
  field: SubscriptionsSortField,
): number | string | null {
  switch (field) {
    case 'name':
      return subscription.name;
    case 'subscriptionType':
      return subscription.subscriptionType.name;
    case 'clinicsCount':
      return subscription.clinicsCount;
    case 'consultingRoomsLimit':
      return subscription.consultingRoomsLimit;
    case 'monthlyPrice':
      return toCents(subscription.monthlyPrice);
    case 'annualPrice':
      return toCents(subscription.annualPrice);
    case 'status':
      return subscription.status.name;
  }
}

/**
 * The Listado, ordered by one of its seven columns (020, FR-006). A `null` value (only possible for
 * `clinicsCount`) always sorts last, in either direction, instead of being compared as a number. A
 * tie keeps the relative order the input already had (`Array.prototype.toSorted` is stable).
 */
export function sortSubscriptions(
  subscriptions: readonly Subscription[],
  sort: SubscriptionsSort,
): Subscription[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return subscriptions.toSorted((a, b) => {
    const left = valueOf(a, sort.field);
    const right = valueOf(b, sort.field);
    if (left === null) {
      return right === null ? 0 : 1;
    }
    if (right === null) {
      return -1;
    }
    if (left < right) {
      return -1 * sign;
    }
    return left > right ? 1 * sign : 0;
  });
}

/** The Comparativo, always ascending by the price of the vigente cycle (020, spec User Story 3). */
export function sortByCyclePrice(
  subscriptions: readonly Subscription[],
  cycle: 'monthly' | 'annual',
): Subscription[] {
  return subscriptions.toSorted(
    (a, b) =>
      toCents(cycle === 'monthly' ? a.monthlyPrice : a.annualPrice) -
      toCents(cycle === 'monthly' ? b.monthlyPrice : b.annualPrice),
  );
}
