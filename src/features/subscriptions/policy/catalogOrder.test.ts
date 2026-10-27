import { describe, expect, it } from 'vitest';

import { pageOf } from '@/shared/lib/pageOf';

import type { Subscription } from '../schemas/subscription';
import { sortCatalog } from './catalogOrder';

const STATUS_NAMES = new Map([
  [1, 'Activa'],
  [2, 'Inactiva'],
  [3, 'Bloqueada'],
  [5, 'En revisión'],
]);

/** A subscription of the catalog; only the id, the name, the price and the status matter here. */
function subscription(id: number, name: string, monthlyPrice: string, statusId = 1): Subscription {
  return {
    id,
    name,
    description: null,
    subscriptionType: { id: 1, name: 'Individual' },
    monthlyPrice,
    annualPrice: monthlyPrice,
    trialDays: 0,
    selfService: false,
    moduleKeys: ['patients'],
    otherFeatures: [],
    consultingRoomsLimit: 1,
    doctorsLimit: 1,
    assistantsLimit: 0,
    newPatientsPerYearLimit: 0,
    status: { id: statusId, name: STATUS_NAMES.get(statusId) ?? 'Otro' },
    clinicsCount: 0,
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
  };
}

const names = (items: readonly Subscription[]) => items.map(({ name }) => name);

/** The test catalog of quickstart.md (step 2), in the order of the API: by creation. */
function quickstartCatalog(): Subscription[] {
  const plans = Array.from({ length: 12 }, (_, index) => {
    const n = index + 1;
    return subscription(
      8 + n,
      `Plan prueba ${String(n).padStart(2, '0')}`,
      `${n * 100}.00`,
      n === 12 ? 5 : 1,
    );
  });
  return [
    subscription(1, 'Básico', '1500.00'),
    subscription(2, 'Pro', '4500.00'),
    subscription(3, 'Clínica Plus', '4500.00'),
    subscription(4, 'Premium', '8900.00'),
    subscription(5, 'Enterprise', '0.00'),
    subscription(6, 'Solo', '900.00', 2),
    subscription(7, 'Legacy full', '0.00', 2),
    subscription(8, 'Suspendido', '2000.00', 3),
    ...plans,
  ];
}

describe('sortCatalog', () => {
  it('puts the active subscriptions first, and every other status together after them', () => {
    const sorted = sortCatalog([
      subscription(1, 'Inactiva barata', '100.00', 2),
      subscription(2, 'Bloqueada', '50.00', 3),
      subscription(3, 'Activa cara', '9000.00', 1),
      subscription(4, 'En revisión', '10.00', 5),
    ]);

    expect(names(sorted)).toEqual(['Activa cara', 'En revisión', 'Bloqueada', 'Inactiva barata']);
  });

  it('sorts each group by the monthly price, from the lowest, comparing cents', () => {
    const sorted = sortCatalog([
      subscription(1, 'A', '1200.00'),
      subscription(2, 'B', '900.00'),
      subscription(3, 'C', '99999999.99'),
      subscription(4, 'D', '0.00'),
    ]);

    expect(names(sorted)).toEqual(['D', 'B', 'A', 'C']);
  });

  it('breaks a tie of price by the name, as Spanish sorts it and without telling the case apart', () => {
    const sorted = sortCatalog([
      subscription(1, 'Pro', '4500.00'),
      subscription(2, 'Clínica Plus', '4500.00'),
      subscription(3, 'básico', '4500.00'),
      subscription(4, 'Ñandú', '4500.00'),
      subscription(5, 'Nube', '4500.00'),
    ]);

    expect(names(sorted)).toEqual(['básico', 'Clínica Plus', 'Nube', 'Ñandú', 'Pro']);
  });

  it('breaks a tie of price and name by the id, so the order is always the same', () => {
    const sorted = sortCatalog([
      subscription(9, 'pro', '4500.00'),
      subscription(3, 'Pro', '4500.00'),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual([3, 9]);
  });

  it('gives the order that quickstart.md describes for its test catalog', () => {
    const sorted = sortCatalog(quickstartCatalog());

    expect(names(sorted)).toEqual([
      'Enterprise',
      'Plan prueba 01',
      'Plan prueba 02',
      'Plan prueba 03',
      'Plan prueba 04',
      'Plan prueba 05',
      'Plan prueba 06',
      'Plan prueba 07',
      'Plan prueba 08',
      'Plan prueba 09',
      'Plan prueba 10',
      'Plan prueba 11',
      'Básico',
      'Clínica Plus',
      'Pro',
      'Premium',
      'Legacy full',
      'Solo',
      'Plan prueba 12',
      'Suspendido',
    ]);
  });

  it('does not change the list it receives', () => {
    const catalog = quickstartCatalog();
    const before = names(catalog);

    sortCatalog(catalog);

    expect(names(catalog)).toEqual(before);
  });
});

// `pageOf` moved to `shared/lib` with its tests (feature 016, research D15); here, the page 2 of
// the sorted catalog, which is what the list of subscriptions shows.
describe('pageOf with the sorted catalog', () => {
  it('gives the second page of ten of the catalog in its fixed order', () => {
    const page = pageOf(sortCatalog(quickstartCatalog()), 2, 10);

    expect(names(page.items)).toEqual([
      'Plan prueba 10',
      'Plan prueba 11',
      'Básico',
      'Clínica Plus',
      'Pro',
      'Premium',
      'Legacy full',
      'Solo',
      'Plan prueba 12',
      'Suspendido',
    ]);
    expect(page).toMatchObject({ total: 20, pages: 2, page: 2, pageWasClamped: false });
  });
});
