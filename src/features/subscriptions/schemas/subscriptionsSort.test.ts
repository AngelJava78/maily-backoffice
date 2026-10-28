import { describe, expect, it } from 'vitest';

import { subscriptionDto } from '@/test/factories';

import { subscriptionSchema, type Subscription } from './subscription';
import { sortByCyclePrice, sortSubscriptions } from './subscriptionsSort';

function subscription(overrides: Parameters<typeof subscriptionDto>[0] = {}): Subscription {
  return subscriptionSchema.parse(subscriptionDto(overrides));
}

// Monthly ascending: beta (500) < alpha (1000) < gamma (2000).
// Annual ascending: gamma (8000) < alpha (9000) < beta (15000) — a different order on purpose,
// so a test that reads the wrong price field is caught.
const alpha = subscription({
  id: 1,
  name: 'Alpha',
  subscription_type: { id: 1, name: 'Individual' },
  clinics_count: 5,
  consulting_rooms_limit: 2,
  monthly_price: '1000.00',
  annual_price: '9000.00',
  status: { id: 1, name: 'Activa' },
});
const beta = subscription({
  id: 2,
  name: 'Beta',
  subscription_type: { id: 2, name: 'Empresarial' },
  clinics_count: null,
  consulting_rooms_limit: 10,
  monthly_price: '500.00',
  annual_price: '15000.00',
  status: { id: 2, name: 'Bloqueada' },
});
const gamma = subscription({
  id: 3,
  name: 'Gamma',
  subscription_type: { id: 1, name: 'Individual' },
  clinics_count: 2,
  consulting_rooms_limit: 1,
  monthly_price: '2000.00',
  annual_price: '8000.00',
  status: { id: 3, name: 'Cancelada' },
});

describe('sortSubscriptions', () => {
  it('sorts by name, ascending and descending', () => {
    expect(sortSubscriptions([alpha, beta, gamma], { field: 'name', direction: 'asc' })).toEqual([
      alpha,
      beta,
      gamma,
    ]);
    expect(sortSubscriptions([alpha, beta, gamma], { field: 'name', direction: 'desc' })).toEqual([
      gamma,
      beta,
      alpha,
    ]);
  });

  it('sorts by subscription type name, keeping the relative order of a tie (stable)', () => {
    // "Empresarial" < "Individual" alphabetically; alpha and gamma tie and keep their input order.
    expect(
      sortSubscriptions([alpha, beta, gamma], { field: 'subscriptionType', direction: 'asc' }),
    ).toEqual([beta, alpha, gamma]);
  });

  it('sorts by clinics count, with a null value always last, regardless of direction', () => {
    expect(
      sortSubscriptions([alpha, beta, gamma], { field: 'clinicsCount', direction: 'asc' }),
    ).toEqual([gamma, alpha, beta]);
    expect(
      sortSubscriptions([alpha, beta, gamma], { field: 'clinicsCount', direction: 'desc' }),
    ).toEqual([alpha, gamma, beta]);
  });

  it('sorts by consulting rooms limit', () => {
    expect(
      sortSubscriptions([alpha, beta, gamma], {
        field: 'consultingRoomsLimit',
        direction: 'asc',
      }),
    ).toEqual([gamma, alpha, beta]);
  });

  it('sorts by monthly price, ascending and descending', () => {
    expect(
      sortSubscriptions([alpha, beta, gamma], { field: 'monthlyPrice', direction: 'asc' }),
    ).toEqual([beta, alpha, gamma]);
    expect(
      sortSubscriptions([alpha, beta, gamma], { field: 'monthlyPrice', direction: 'desc' }),
    ).toEqual([gamma, alpha, beta]);
  });

  it('sorts monthly price by its exact value, never as text (research D7, D10)', () => {
    const cheaper = subscription({ id: 10, name: 'X', monthly_price: '999.99' });
    const pricier = subscription({ id: 11, name: 'Y', monthly_price: '1000.00' });
    // Alphabetically "1000.00" < "999.99" (the digit "1" sorts before "9"); the real order is the
    // opposite, so this proves the comparison is numeric, not lexicographic.
    expect(
      sortSubscriptions([pricier, cheaper], { field: 'monthlyPrice', direction: 'asc' }),
    ).toEqual([cheaper, pricier]);
  });

  it('sorts by annual price, a different order than monthly price on purpose', () => {
    expect(
      sortSubscriptions([alpha, beta, gamma], { field: 'annualPrice', direction: 'asc' }),
    ).toEqual([gamma, alpha, beta]);
  });

  it('sorts by status name', () => {
    // "Activa" < "Bloqueada" < "Cancelada" alphabetically.
    expect(sortSubscriptions([gamma, beta, alpha], { field: 'status', direction: 'asc' })).toEqual([
      alpha,
      beta,
      gamma,
    ]);
  });

  it('does not mutate the array it receives', () => {
    const input = [gamma, alpha, beta];
    const copy = [...input];
    sortSubscriptions(input, { field: 'name', direction: 'asc' });
    expect(input).toEqual(copy);
  });
});

describe('sortByCyclePrice', () => {
  it('orders ascending by monthly price when the cycle is monthly', () => {
    // Monthly ascending: beta (500) < alpha (1000) < gamma (2000).
    expect(sortByCyclePrice([gamma, alpha, beta], 'monthly')).toEqual([beta, alpha, gamma]);
  });

  it('orders ascending by annual price when the cycle is annual, a different order on purpose (020, research D2)', () => {
    // Annual ascending: gamma (8000) < alpha (9000) < beta (15000).
    expect(sortByCyclePrice([alpha, beta, gamma], 'annual')).toEqual([gamma, alpha, beta]);
  });

  it('compares the exact cents, never the formatted text (research D7)', () => {
    const cheaper = subscription({ id: 10, name: 'X', monthly_price: '999.99' });
    const pricier = subscription({ id: 11, name: 'Y', monthly_price: '1000.00' });
    expect(sortByCyclePrice([pricier, cheaper], 'monthly')).toEqual([cheaper, pricier]);
  });

  it('does not mutate the array it receives', () => {
    const input = [gamma, alpha, beta];
    const copy = [...input];
    sortByCyclePrice(input, 'monthly');
    expect(input).toEqual(copy);
  });
});
