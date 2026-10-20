import { describe, expect, it } from 'vitest';

import type { Subscription } from '../schemas/subscription';
import { pageOf, sortCatalog } from './catalogOrder';

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
    monthlyPrice,
    features: [],
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

describe('pageOf', () => {
  const sorted = sortCatalog(quickstartCatalog());

  it('gives the page asked for, with the total and the number of pages', () => {
    const page = pageOf(sorted, 2, 10);

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

  it('gives at most the size of the page, and what is left on the last one', () => {
    expect(pageOf(sorted, 1, 25).items).toHaveLength(20);
    expect(pageOf(sorted, 1, 25)).toMatchObject({ pages: 1, page: 1 });
    expect(pageOf(sorted.slice(0, 13), 2, 10).items).toHaveLength(3);
  });

  it('gives the last page instead of one after it, and says so', () => {
    const page = pageOf(sorted, 99, 10);

    expect(page).toMatchObject({ page: 2, pages: 2, pageWasClamped: true });
    expect(page.items).toHaveLength(10);
  });

  it('gives the first page, without pages, for an empty catalog', () => {
    expect(pageOf([], 1, 10)).toEqual({
      items: [],
      total: 0,
      pages: 0,
      page: 1,
      pageWasClamped: false,
    });
    expect(pageOf([], 3, 10)).toMatchObject({ page: 1, pageWasClamped: true });
  });
});
